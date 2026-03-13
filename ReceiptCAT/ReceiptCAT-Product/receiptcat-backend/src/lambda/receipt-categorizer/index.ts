import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { SYSTEM_PROMPT_NO_SHOT } from "./prompt";

const bedrockClient = new BedrockRuntimeClient();
const dynamoClient = new DynamoDBClient();

const RECEIPTS_TABLE = process.env.RECEIPTS_TABLE || "";

export async function handler(event: any, context: any) {
  // Step 1: Parse SNS Input
  let receipt: any = null;
  try {
    const message = event.Records[0].Sns.Message;
    // console.log("Incoming SNS message:", message);
    receipt = JSON.parse(message);
  } catch (err) {
    // console.error("Error parsing event input:", err);
  }
  if (!receipt) {
    // console.error("Unable to parse receipt from event. Event:", JSON.stringify(event, null, 2));
    throw new Error("Could not extract receipt from event input.");
  }
  // console.log(`Parsed receipt object: `, receipt);

  // Step 2: Setup Prompt to send
  const receiptString = stringifyReceiptForPrompt(receipt);
  const userPrompt = `<receipt>\n${receiptString}\n</receipt>`;

  // console.log(`User Prompt for Claude: `, receiptString);

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    system: SYSTEM_PROMPT_NO_SHOT,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userPrompt }],
      },
    ],
  };

  // Step 3: Process receipt with Bedrock
  const command = new InvokeModelCommand({
    modelId: "apac.anthropic.claude-3-7-sonnet-20250219-v1:0",
    body: JSON.stringify(payload),
    contentType: "application/json",
  });

  const response = await bedrockClient.send(command);
  const responseStr = new TextDecoder("utf-8").decode(response.body);
  // console.log("Bedrock response text:", responseStr);

  // Step 4: Parse the response to obtain categories list
  const categories = extractCategoriesFromModelResponse(responseStr);
  // console.log("Extracted categories:", categories);
  // Get values of the categories 
  const values = mapCategoriesToValues(categories);
  // console.log("Extracted values:", values);

  // Step 5: Store receipt category values in DynamoDB
  await updateReceiptWithCategories(receipt.user_id, receipt.receipt_id, values);

  // console.log("Receipt categorization request processed successfully.");
}

export function stringifyReceiptForPrompt(receipt: any): string {
  let result = "";
  if (receipt.vendor) result += `Vendor: ${receipt.vendor}\n`;
  if (receipt.date) result += `Date: ${receipt.date}\n`;
  if (receipt.total) {
    const rawTotal = typeof receipt.total === "string"
      ? receipt.total.replace(/[^0-9.\-]/g, "").trim()
      : receipt.total;
    const totalNum = parseFloat(rawTotal);
    const total = isNaN(totalNum) ? "0.00" : totalNum.toFixed(2);
    result += `Total Amount: $${total}\n`;
  }
  const items = receipt.lineItems || receipt.items;
  if (items && Array.isArray(items)) {
    result += `Item${items.length > 1 ? 's' : ''}:\n`;
    if (items.length > 0) {
      items.forEach((item: any, index: number) => {
        let name = item.name || "Unnamed Item";
        // Clean name: replace \r or \n with space, collapse multiple spaces, trim
        name = name.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
        const rawPrice = typeof item.price === "string" ? item.price.replace(/[^0-9.\-]/g, "").trim() : item.price;
        const priceNum = parseFloat(rawPrice);
        const price = isNaN(priceNum) ? "0.00" : priceNum.toFixed(2);
        const quantity = item.quantity || "1";
        result += `[ITEM #${index + 1}]: "${name}" - $${price} x ${quantity}\n`;
      });
    } else {
      const rawTotal = typeof receipt.total === "string"
        ? receipt.total.replace(/[^0-9.\-]/g, "").trim()
        : receipt.total;
      const totalNum = parseFloat(rawTotal);
      const total = isNaN(totalNum) ? "0.00" : totalNum.toFixed(2);

      result += `[ITEM #1]: "${receipt.vendor}" - $${total} x ${1}\n`;
    }
  } else {
    result += `Item:\n`;

    const rawTotal = typeof receipt.total === "string"
      ? receipt.total.replace(/[^0-9.\-]/g, "").trim()
      : receipt.total;
    const totalNum = parseFloat(rawTotal);
    const total = isNaN(totalNum) ? "0.00" : totalNum.toFixed(2);

    result += `[ITEM #1]: "${receipt.vendor}" - $${total} x ${1}\n`;
  }
  return result.trim();
}

// Helper: Extract categories from Bedrock model response
export function extractCategoriesFromModelResponse(responseBody: string): string[] {
  try {
    const parsed = JSON.parse(responseBody);

    // Claude response structure
    if (parsed.content && Array.isArray(parsed.content)) {
      const textEntry = parsed.content.find((c: any) => c.type === "text");
      if (textEntry?.text) {
        // Try parsing the string as a JSON array
        try {
          const innerParsed = JSON.parse(textEntry.text);
          if (Array.isArray(innerParsed)) {
            return innerParsed.map((s) => s.trim());
          }
        } catch {
          // Fallback: try to extract from plain string
          return textEntry.text
            .replace(/[\[\]"]+/g, "")
            .split(",")
            .map((s: string) => s.trim());
        }
      }
    }
  } catch (e) {
    // Not JSON, try to extract categories from plain text
    const match = responseBody.match(/Categories?:\s*\[([^\]]+)\]/i);
    if (match) {
      return match[1].split(",").map((s) => s.trim());
    }
  }

  // Fallback: empty list
  return [];
}

// Helper: update category names to use values instead
function mapCategoriesToValues(categories: string[]): string[] {
  const mapping: Record<string, string> = {
    "Fruits & Vegetables": "fruits_vegetables",
    "Meat & Seafood & Deli": "meat_seafood_deli",
    "Dairy & Eggs & Fridge": "dairy_eggs_fridge",
    "Frozen": "frozen",
    "Pantry & Snacks": "pantry_snacks",
    "Bakery": "bakery",
    "Coffee & Tea": "coffee_tea",
    "Drinks": "drinks",
    "Liquor": "liquor",
    "Eating Out": "eating_out",
    "Health & Medicine": "health_medicine",
    "Personal Care & Beauty": "personal_care_beauty",
    "Cleaning & Maintenance": "cleaning_maintenance",
    "Baby & Maternity": "baby_maternity",
    "Pets": "pets",
    "Clothing & Footwear": "clothing_footwear",
    "Electronics & Tech": "electronics_tech",
    "Home & Lifestyle": "home_lifestyle",
    "Sports & Fitness": "sports_fitness",
    "Gifts & Occasions": "gifts_occasions",
    "Entertainment": "entertainment",
    "Subscriptions & Digital Services": "subscriptions_digital",
    "Professional Services": "professional_services",
    "Utilities & Bills": "utilities_bills",
    "Transport & Fuel": "transport_fuel",
    "Travel & Holidays": "travel_holidays",
    "Other": "other"
  };

  return categories.map((category) => mapping[category.trim()] ?? "other");
}

// Update DynamoDB record with categories
export async function updateReceiptWithCategories(user_id: string, receipt_id: string, categories: string[]) {
  if (!RECEIPTS_TABLE) {
    throw new Error("DynamoDB table name is not set in RECEIPTS_TABLE env variable.");
  }

  // Step 1: Fetch the existing receipt
  const getResp = await dynamoClient.send(
    new GetItemCommand({
      TableName: RECEIPTS_TABLE,
      Key: { user_id: { S: user_id }, receipt_id: { S: receipt_id } },
    })
  );

  const items = getResp.Item?.items?.S
    ? JSON.parse(getResp.Item.items.S)
    : [];
  

  // Step 2: Append category values to each item 
  const updatedItems = items.map((item: any, i: number) => ({
    ...item,
    category: categories[i] ?? "Other", // default other
  }));

  // Step 3: Save back to dynamoDB
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: RECEIPTS_TABLE,
      Key: { user_id: { S: user_id }, receipt_id: { S: receipt_id } },
      UpdateExpression: "SET #items = :items",
      ExpressionAttributeNames: { "#items": "items" },
      ExpressionAttributeValues: {
        ":items": { S: JSON.stringify(updatedItems) },
      },
    })
  );
}
