import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { sanitiseAmount } from "../../lib/receiptsUtils";

const ddb = new DynamoDBClient({});
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Allow-Methods": "PUT,OPTIONS" };

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  const userId = event.pathParameters?.userId;
  const receiptId = event.pathParameters?.receiptId;
  if (!userId || !receiptId || !event.body) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing parameters or body" }) };

  try {
    const body = JSON.parse(event.body);
    const allowedFields = ["vendor", "items", "total"];
    const updateFields: Record<string, any> = {};
    allowedFields.forEach(f => { if (body[f] !== undefined) updateFields[f] = body[f]; });

    if (!Object.keys(updateFields).length) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "No valid fields to update" }) };

    const key = { user_id: { S: userId }, receipt_id: { S: receiptId } };
    const currentResult = await ddb.send(new GetItemCommand({ TableName: process.env.RECEIPTS_TABLE!, Key: key }));
    const currentItem = currentResult.Item;
    if (!currentItem) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: "Receipt not found" }) };
    if (currentItem.user_id?.S !== userId) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Forbidden" }) };

    const updatedVendor = updateFields.vendor ?? currentItem.vendor?.S;
    const updatedTotal = updateFields.total ?? currentItem.total?.N ?? currentItem.total?.S;
    const updatedItems = updateFields.items ?? (currentItem.items?.S ? JSON.parse(currentItem.items.S) : []);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.RECEIPTS_TABLE!,
      Key: key,
      UpdateExpression: "SET #v = :v, #t = :t, #i = :i",
      ExpressionAttributeNames: { "#v": "vendor", "#t": "total", "#i": "items" },
      ExpressionAttributeValues: { ":v": { S: updatedVendor }, ":t": { N: Number(updatedTotal).toFixed(2) }, ":i": { S: JSON.stringify(updatedItems) } },
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ receiptId, vendor: updatedVendor, total: sanitiseAmount(updatedTotal), items: updatedItems }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
