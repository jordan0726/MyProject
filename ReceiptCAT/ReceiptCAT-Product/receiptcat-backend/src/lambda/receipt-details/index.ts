import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ReceiptItem, sanitiseAmount } from "../../lib/receiptsUtils";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Allow-Methods": "GET,OPTIONS" };

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  const userId = event.pathParameters?.userId;
  const receiptId = event.pathParameters?.receiptId;
  if (!userId || !receiptId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing userId or receiptId" }) };

  try {
    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.RECEIPTS_TABLE!,
      Key: { user_id: { S: userId }, receipt_id: { S: receiptId } },
    }));

    const receipt = result.Item;
    if (!receipt) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "Receipt not found" }) };

    let items: ReceiptItem[] = [];
    if (receipt.items?.S) items = JSON.parse(receipt.items.S).map((it: any) => ({ ...it, price: sanitiseAmount(it.price), quantity: it.quantity ?? 1 }));

    let image_url: string | null = null;
    if (receipt.s3_path?.S) {
      const [, , bucket, ...keyParts] = receipt.s3_path.S.split("/");
      image_url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: keyParts.join("/") }), { expiresIn: 3600 });
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        receiptId,
        date: receipt.date?.S ?? "Unknown",
        vendor: receipt.vendor?.S ?? "Unknown",
        total: sanitiseAmount(receipt.total?.N ?? receipt.total?.S),
        items,
        image_url,
      }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
