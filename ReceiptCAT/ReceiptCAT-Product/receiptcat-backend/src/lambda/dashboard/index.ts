import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { buildCategoryGroups, Receipt, sanitiseAmount } from "../../lib/receiptsUtils";

const ddb = new DynamoDBClient({});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

  const userId = event.pathParameters?.userId;
  const fromDate = event.queryStringParameters?.fromDate;
  const toDate = event.queryStringParameters?.toDate;

  if (!userId || !fromDate || !toDate) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing parameters" }) };
  }

  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: process.env.RECEIPTS_TABLE!,
        IndexName: "user_date-index",
        KeyConditionExpression: "user_id = :uid AND #d BETWEEN :from AND :to",
        ExpressionAttributeNames: { "#d": "date" },
        ExpressionAttributeValues: {
          ":uid": { S: userId },
          ":from": { S: fromDate },
          ":to": { S: toDate },
        },
      })
    );

    const receipts: Receipt[] = (result.Items ?? []).map((item: any) => ({
      receiptId: item.receipt_id.S!,
      date: item.date?.S ?? "Unknown",
      vendor: item.vendor?.S ?? "Unknown",
      total: item.total?.N ? parseFloat(item.total.N) : sanitiseAmount(item.total?.S),
      items: JSON.parse(item.items?.S ?? "[]").map((i: any) => ({
        receiptId: item.receipt_id.S!,
        name: i.name,
        category: i.category,
        price: sanitiseAmount(i.price),
        quantity: i.quantity ? Number(i.quantity) : 1,
        purchasedAt: item.date?.S ?? "Unknown",
      })),
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ receiptsCount: receipts.length, categoryGroups: buildCategoryGroups(receipts) }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};
