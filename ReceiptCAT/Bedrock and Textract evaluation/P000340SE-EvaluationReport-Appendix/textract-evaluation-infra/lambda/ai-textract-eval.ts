import { S3Event } from "aws-lambda";
import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const textractClient = new TextractClient({});
const ddbClient = new DynamoDBClient({});
const s3Client = new S3Client({});

const RECEIPTS_TABLE = process.env.RECEIPTS_TABLE || "";
const dummyUserId = "dummyuser123";

export const ExtractReceiptData = async (event: S3Event): Promise<void> => {
  try {
    // Step 1: Parse S3 event
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    let key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const s3IncomingFilepath = `s3://${bucket}/${key}`;

    // Step 2: Verify S3 object exists
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      // console.log(`S3 object found: ${s3IncomingFilepath}`);
    } catch (error) {
      console.error(`S3 object not found: ${s3IncomingFilepath}`, error);
      throw new Error(`S3 object not found: ${s3IncomingFilepath}`);
    }

    // Step 3: Process receipt with Textract
    const receipt = await processReceiptWithTextract(bucket, key);
    console.log("Extracted Receipt Data:", JSON.stringify(receipt, null, 2));

    // Step 4: Store receipt in DynamoDB
    receipt.s3_path = s3IncomingFilepath;
    receipt.processed_at = new Date().getTime();
    await storeReceiptInDynamoDB(receipt);

  } catch (err) {
    console.error("Error processing S3 event:", err);
    throw err;
  }
};

async function processReceiptWithTextract(bucket: string, key: string) {
  try {
    console.log(`Calling Textract analyze_expense for ${bucket}/${key}`);
    const analyzeCmd = new AnalyzeExpenseCommand({
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key
        }
      }
    });
    const response = await textractClient.send(analyzeCmd);
    console.log("Textract analyze_expense call successful");

    const receipt_id = uuidv4();
    const receipt_data: any = {
      receipt_id,
      user_id: dummyUserId,
      date: new Date().toISOString().split("T")[0],
      vendor: "Unknown",
      total: "0.00",
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
            receipt_data.total = value;
          } else if (field_type === "INVOICE_RECEIPT_DATE") {
            try {
              receipt_data.date = value;
            } catch {
              // Keep default date
            }
          } else if (field_type === "VENDOR_NAME") {
            receipt_data.vendor = value;
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
                item.price = value;
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

    // console.log("Extracted receipt data:", JSON.stringify(receipt_data, null, 2));
    return receipt_data;
  } catch (e) {
    console.error(`Textract analyze_expense call failed: ${e}`);
    throw e;
  }
}

async function storeReceiptInDynamoDB(receipt: any) {
  await ddbClient.send(
    new PutItemCommand({
      TableName: RECEIPTS_TABLE,
      Item: {
        receipt_id: { S: receipt.receipt_id },
        user_id: {S: receipt.user_id},
        date: { S: receipt.date },
        vendor: { S: receipt.vendor },
        total: { S: receipt.total },
        items: { S: JSON.stringify(receipt.items) },
        s3_path: { S: receipt.s3_path },
        processed_at: { S: receipt.processed_at.toString() }
      },
    })
  );
}