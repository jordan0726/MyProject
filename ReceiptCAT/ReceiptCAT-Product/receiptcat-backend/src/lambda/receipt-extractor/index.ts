import { S3Event } from "aws-lambda";
import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { S3Client, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import * as chrono from "chrono-node";

const textractClient = new TextractClient({});
const ddbClient = new DynamoDBClient({});
const snsClient = new SNSClient({});
const s3Client = new S3Client({});

const RECEIPTS_TABLE = process.env.RECEIPTS_TABLE || "";
const RECEIPTS_TOPIC_ARN = process.env.RECEIPTS_TOPIC_ARN || "";
let userID: string | null = null;

export const handler = async (event: S3Event): Promise<void> => {
  // console.log("FULL EVENT:", JSON.stringify(event, null, 2));
  try {
    function isValidKey(key: string): boolean {
      // Regex:
      // - users/tmp/<sub>/receipts
      // - <timestamp> = digits
      // - <uuid> = UUIDv4
      // - <safeName> = up to 120 chars [a-zA-Z0-9._-]
      const regex = /^tmp\/users\/[0-9a-fA-F-]+\/receipts\/\d+_[0-9a-fA-F-]{36}_[a-zA-Z0-9._-]{1,120}$/;
      return regex.test(key)
    }

    // Step 1: Parse S3 event
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    let key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    if (!isValidKey(key)) {
      // console.error("Invalid S3 key structure:", key)
      throw new Error("S3 key does not follow expected structure")
    }
    userID = key.match(/^tmp\/users\/([^/]+)\/receipts\//)?.[1] || null;
    const s3IncomingFilepath = `s3://${bucket}/${key}`;

    // Step 2: Verify S3 object exists
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      // console.log(`S3 object found: ${s3IncomingFilepath}`);
    } catch (error) {
      // console.error(`S3 object not found: ${s3IncomingFilepath}`, error);
      throw new Error(`S3 object not found: ${s3IncomingFilepath}`);
    }

    // Step 3: Process receipt with Textract
    const receipt = await processReceiptWithTextract(bucket, key);
    // console.log("Extracted Receipt Data:", JSON.stringify(receipt, null, 2));

    // Step 4: Set up new receipt processed filepath and processed_at
    const newKey = key.replace(/^tmp\//, "");
    const s3ProcessedFilepath = `s3://${bucket}/${newKey}`;
    receipt.s3_path = s3ProcessedFilepath;
    receipt.processed_at = new Date().getTime();
    // console.log(`Updated receipt S3 path to ${s3ProcessedFilepath}`);

    // Step 5: Store receipt in DynamoDB
    await storeReceiptInDynamoDB(receipt);

    // Step 6: Publish SNS notification
    await publishSnsNotification(receipt);

    // Step 7: Move processed file from incoming/ to processed/
    try {
      await s3Client.send(new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: newKey,
      }));

      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      // console.log(`Moved file from ${key} to ${newKey}`);
    } catch (moveError) {
      // console.error(`Error moving file from ${key} to ${newKey}`, moveError);
      throw moveError;
    }
  } catch (err) {
    // console.error("Error processing S3 event:", err);
    throw err;
  }
};

// Function to convert date to YYYY-MM-DD format
export function sanitiseDate(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];

  const parsed = chrono.parseDate(rawDate);
  if (!parsed) {
    console.warn(`Could not parse date: ${rawDate}, defaulting to today`);
    return new Date().toISOString().split("T")[0];
  }

  // Normalize to YYYY-MM-DD  
  return parsed.toISOString().split("T")[0];
}


// Function to convert price/amount to number normalised to 2 decimal places
export function sanitiseAmount(rawAmount: string): number {
  if (!rawAmount) return 0.00;

  // Remove $, AUD, commas, and spaces
  const cleaned = rawAmount.replace(/[^0-9.,-]/g, "");

  // Handle commas as decimal separators
  const normalized = cleaned.replace(",", ".");

  let value = parseFloat(normalized);
  if (isNaN(value)) {
    console.warn(`Could not parse amount: ${rawAmount}, defaulting to 0`);
    value = 0;
  }

  // Round to 2 decimal places and return as number
  return Math.round(value * 100) / 100;
}

async function processReceiptWithTextract(bucket: string, key: string) {
  try {
    // console.log(`Calling Textract analyze_expense for ${bucket}/${key}`);
    const analyzeCmd = new AnalyzeExpenseCommand({
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    });
    const response = await textractClient.send(analyzeCmd);
    // console.log("Textract analyze_expense call successful");

    const receipt_id = uuidv4();
    const receipt_data: any = {
      receipt_id,
      user_id: userID,
      date: new Date().toISOString().split("T")[0],
      vendor: "Unknown",
      total: 0.00,
      items: []
    };

    const expenseDocs = response.ExpenseDocuments ?? [];
    if (expenseDocs.length > 0) {
      const expense_doc = expenseDocs[0];

      if (expense_doc.SummaryFields) {
        for (const field of expense_doc.SummaryFields) {
          const field_type = field.Type?.Text || "";
          const value = field.ValueDetection?.Text || "";

          if (field_type === "TOTAL") {
            receipt_data.total = sanitiseAmount(value);
          } else if (field_type === "INVOICE_RECEIPT_DATE") {
            receipt_data.date = sanitiseDate(value);
          } else if (field_type === "VENDOR_NAME") {
            receipt_data.vendor = value.trim();
          }
        }
      }

      if (expense_doc.LineItemGroups) {
        for (const group of expense_doc.LineItemGroups) {
          for (const lineItem of group.LineItems ?? []) {
            const item: any = {};
            for (const field of lineItem.LineItemExpenseFields ?? []) {
              const field_type = field.Type?.Text || "";
              const value = field.ValueDetection?.Text || "";

              if (field_type === "ITEM") {
                item.name = value;
              } else if (field_type === "PRICE") {
                item.price = sanitiseAmount(value);
              } else if (field_type === "QUANTITY") {
                item.quantity = value;
              }
            }

            if (item.name) {
              receipt_data.items.push(item);
            }
          }
        }
      }
    }

    applyItemTotalFallback(receipt_data);

    // console.log("Extracted receipt data:", JSON.stringify(receipt_data, null, 2));
    return receipt_data;
  } catch (e) {
    // console.error(`Textract analyze_expense call failed: ${e}`);
    throw e;
  }
}

async function storeReceiptInDynamoDB(receipt: any) {
  await ddbClient.send(
    new PutItemCommand({
      TableName: RECEIPTS_TABLE,
      Item: {
        receipt_id: { S: receipt.receipt_id },
        user_id: { S: receipt.user_id },
        date: { S: receipt.date },
        vendor: { S: receipt.vendor },
        total: { N: receipt.total.toFixed(2) },
        items: {
          S: JSON.stringify(
            receipt.items.map((i: any) => ({
              ...i,
              price: i.price ? Number(i.price.toFixed(2)) : 0.00,
              quantity: i.quantity ? Number(i.quantity) : 1,
            }))
          )
        },
        s3_path: { S: receipt.s3_path },
        processed_at: { S: receipt.processed_at.toString() }
      },
    })
  );
}

async function publishSnsNotification(receipt: any) {
  await snsClient.send(
    new PublishCommand({
      TopicArn: RECEIPTS_TOPIC_ARN,
      Message: JSON.stringify(receipt),
      Subject: "New Receipt Processed",
    })
  );
}

type ReceiptForFallback = {
  total: number;
  items?: Array<{ price?: number }>;
};

// Added by Jordan Chiou on 2025-10-17
/**
 * Provides a fallback mechanism for missing total values when Textract fails to detect the total amount.
 * If the total is zero or missing, this guard sums up the prices of all line items to estimate the total instead.
 * This ensures that a reasonable total is available even if Textract does not extract it directly.
 */
function applyItemTotalFallback(receipt: ReceiptForFallback) {
  if (receipt.total === 0 && Array.isArray(receipt.items)) {
    const totalFromItems = receipt.items
      .map((item) => (typeof item.price === "number" ? item.price : 0))
      .reduce((acc, price) => acc + price, 0);

    if (totalFromItems > 0) {
      receipt.total = Math.round(totalFromItems * 100) / 100;
    }
  }
}
