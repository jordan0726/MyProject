import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

import { SYSTEM_PROMPT_P2_NO_SHOT, SYSTEM_PROMPT_P2_RULES_NO_SHOT, SYSTEM_PROMPT_P2_RULES_FEW_SHOT } from "./prompt"

const client = new BedrockRuntimeClient({ region: "ap-southeast-2" });

interface ReceiptRow {
  receipt_id: string;
  date: string;
  s3_path: string;
  vendor: string;
  total: string;
  items: string;
}

interface ModelResponse {
  raw: string;
  parsed: any;
  durationMs?: number;
}

const buildClaudeP2Payload = (receiptText: string) => ({
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  system: SYSTEM_PROMPT_P2_NO_SHOT,
  messages: [{ role: "user", content: [{ type: "text", text: `<receipt>\n${receiptText}\n</receipt>` }] }],
});

const buildClaudeP2RulesNSPayload = (receiptText: string) => ({
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  system: SYSTEM_PROMPT_P2_RULES_NO_SHOT,
  messages: [{ role: "user", content: [{ type: "text", text: `Here is the receipt you need to analyze:\n\n<receipt>\n${receiptText}\n</receipt>` }] }],
});

const buildClaudeP2RulesFsPayload = (receiptText: string) => ({
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  system: SYSTEM_PROMPT_P2_RULES_FEW_SHOT,
  messages: [{ role: "user", content: [{ type: "text", text: `Here is the receipt you need to analyze:\n\n<receipt>\n${receiptText}\n</receipt>` }] }],
});

async function callModel(modelId: string, payload: any): Promise<ModelResponse> {
  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(payload),
    contentType: "application/json",
    accept: "application/json",
  });
  const resp = await client.send(command);
  const raw = new TextDecoder("utf-8").decode(resp.body);

  // console.log('RAW RESP', resp);
  
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return { raw, parsed };
}

async function timedCall(modelId: string, payload: any): Promise<ModelResponse> {
  const start = Date.now();
  const result = await callModel(modelId, payload);
  const end = Date.now();
  return { ...result, durationMs: end - start };
}

async function main() {
  const inputPath = path.resolve("data/textract_output_data_s.csv");
  const outputResultsPath = path.resolve("data/bedrock_eval/phase2/step1_model_eval/bedrock_output_phase2_eval_results.csv");
  const outputPromptsPath = path.resolve("data/bedrock_eval/phase2/step1_model_eval/bedrock_output_phase2_prompt_token_results.csv");

  // Initialize arrays and sets for existing data
  let categorisationRows: any[] = [];
  let promptRows: any[] = [];
  const processedReceiptIds = new Set<string>();

  // Load existing categorisation results if file exists
  if (fs.existsSync(outputResultsPath)) {
    const existingCategorisationCsv = fs.readFileSync(outputResultsPath, "utf8");
    const parsed = Papa.parse(existingCategorisationCsv, { header: true });
    categorisationRows = parsed.data as any[];
  }

  // Load existing prompt token results if file exists and collect processed receipt_ids
  if (fs.existsSync(outputPromptsPath)) {
    const existingPromptCsv = fs.readFileSync(outputPromptsPath, "utf8");
    const parsed = Papa.parse(existingPromptCsv, { header: true });
    promptRows = parsed.data as any[];
    for (const row of promptRows) {
      if (row.receipt_id) {
        processedReceiptIds.add(row.receipt_id);
      }
    }
  }

  const csvData = fs.readFileSync(inputPath, "utf8");
  const receipts: ReceiptRow[] = Papa.parse(csvData, { header: true }).data as any;

  let count = 1;
  for (const r of receipts) {
    if (!r.receipt_id) continue;

    console.log(`Processing Receipt ${count++} of ${receipts.length-1}:`, r.receipt_id);

    if (processedReceiptIds.has(r.receipt_id)) {
      console.log(`    Skipping already processed receipt_id: ${r.receipt_id}`);
      continue;
    }

    // Parse item names, quantities, and prices
    let itemNames: string[] = [];
    let itemQuantities: string[] = [];
    let itemPrices: string[] = [];
    
    try {
      // Clean up doubled double quotes before parsing
      let cleaned = r.items.replace(/""/g, '"');
      cleaned = cleaned.replace(/^"|"$/g, "");
      const parsed = JSON.parse(cleaned);
      r.items = parsed;

      if (Array.isArray(parsed)) {
        itemNames = parsed.map((i: any) => (typeof i === "object" && i.name ? i.name : JSON.stringify(i)));
        itemQuantities = parsed.map((i: any) => (typeof i === "object" && i.quantity != null ? String(i.quantity) : ""));
        itemPrices = parsed.map((i: any) => (typeof i === "object" && i.price != null ? String(i.price) : ""));
      }
    } catch {
      itemNames = r.items
        .split(/[,\\n]/)
        .map((line) => line.trim())
        .filter(Boolean);
      itemQuantities = itemNames.map(() => "");
      itemPrices = itemNames.map(() => "");
    }

    // Fallback if items length is 0
    if (itemNames.length === 0) {
      itemNames = [r.vendor || "Unknown"];
      itemPrices = [r.total];
      itemQuantities = ["1"];
    }

    const receiptText = stringifyReceiptForPrompt(r);

    // Build payloads
    const claude37_p2_payload = buildClaudeP2Payload(receiptText);
    const claude37_p2_rules_payload = buildClaudeP2RulesNSPayload(receiptText);
    const claude37_p2_rules_fs_payload = buildClaudeP2RulesFsPayload(receiptText);

    // Call models
    const [claude37_p2, claude37_p2_rules, claude37_p2_rules_fs] = await Promise.all([
      timedCall("apac.anthropic.claude-3-7-sonnet-20250219-v1:0", claude37_p2_payload),
      timedCall("apac.anthropic.claude-3-7-sonnet-20250219-v1:0", claude37_p2_rules_payload),
      timedCall("apac.anthropic.claude-3-7-sonnet-20250219-v1:0", claude37_p2_rules_fs_payload),
    ]);

    // Extract categories
    const claude37_p2_raw_cats = extractCategoriesFromModelResponse(claude37_p2.raw);
    const claude37_p2_rules_raw_cats = extractCategoriesFromModelResponse(claude37_p2_rules.raw);
    const claude37_p2_rules_fs_raw_cats = extractCategoriesFromModelResponse(claude37_p2_rules_fs.raw);

    const claude37_p2_mapped_cats = mapCategoriesToValues(claude37_p2_raw_cats);
    const claude37_p2_rules_mapped_cats = mapCategoriesToValues(claude37_p2_rules_raw_cats);
    const claude37_p2_rules_fs_mapped_cats = mapCategoriesToValues(claude37_p2_rules_fs_raw_cats);

    // Record output lengths for each model's categories
    const claude37_p2_output_length = claude37_p2_mapped_cats.length;
    const claude37_p2_rules_output_length = claude37_p2_rules_raw_cats.length;
    const claude37_p2_rules_fs_output_length = claude37_p2_rules_fs_raw_cats.length;

    // Only iterate up to itemNames.length
    for (let idx = 0; idx < itemNames.length; idx++) {
      // Format receipt_total as currency
      const rawTotal = typeof r.total === "string"
        ? r.total.replace(/[^0-9.\-]/g, "").trim()
        : r.total;
      const totalNum = parseFloat(rawTotal);
      const formattedTotal = isNaN(totalNum) ? "$0.00" : `$${totalNum.toFixed(2)}`;

      // Format item_price as currency
      const rawPrice = itemPrices[idx] ?? "";
      const cleanedPrice = typeof rawPrice === "string" ? rawPrice.replace(/[^0-9.\-]/g, "").trim() : rawPrice;
      const priceNum = parseFloat(cleanedPrice);
      const formattedPrice = isNaN(priceNum) ? "$0.00" : `$${priceNum.toFixed(2)}`;

      categorisationRows.push({
        key: `${r.receipt_id}_${idx}`,
        receipt_id: r.receipt_id,
        receipt_date: r.date,
        receipt_s3_path: r.s3_path,
        receipt_vendor: r.vendor,
        receipt_total: formattedTotal,
        item_name: itemNames[idx] ?? "",
        item_quantity: itemQuantities[idx] ?? "",
        item_price: formattedPrice,
        claude37_p2_output: claude37_p2_mapped_cats[idx] ?? "",
        claude37_p2_rules_output: claude37_p2_rules_mapped_cats[idx] ?? "",
        claude37_p2_rules_fs_output: claude37_p2_rules_fs_mapped_cats[idx] ?? "",
        claude37_p2_raw_item_output: claude37_p2_raw_cats[idx] ?? "",
        claude37_p2_rules_raw_item_output: claude37_p2_rules_raw_cats[idx] ?? "",
        claude37_p2_rules_fs_raw_item_output: claude37_p2_rules_fs_raw_cats[idx] ?? ""
      });
    }

    // Remove existing rows with the same receipt_id in promptRows before pushing new row
    promptRows = promptRows.filter(row => row.receipt_id !== r.receipt_id);
    
    // Receipt-level logging for prompts + tokens, and model output lengths
    promptRows.push({
      receipt_id: r.receipt_id,
      receipt_date: r.date,
      receipt_s3_path: r.s3_path,
      receipt_vendor: r.vendor,
      receipt_total: r.total,
      claude37_p2_input_prompt: `${claude37_p2_payload.system}\n\n${claude37_p2_payload.messages[0].content[0].text}`,
      claude37_p2_rules_input_prompt: `${claude37_p2_rules_payload.system}\n\n${claude37_p2_rules_payload.messages[0].content[0].text}`,
      claude37_p2_rules_fs_input_prompt: `${claude37_p2_rules_fs_payload.system}\n\n${claude37_p2_rules_fs_payload.messages[0].content[0].text}`,
      claude37_p2_raw_output: claude37_p2.parsed.content[0].text,
      claude37_p2_rules_raw_output: claude37_p2_rules.parsed.content[0].text,
      claude37_p2_rules_fs_raw_output: claude37_p2_rules_fs.parsed.content[0].text,
      ground_truth_item_count: itemNames.length,
      claude37_p2_output_length: claude37_p2_output_length,
      claude37_p2_rules_output_length: claude37_p2_rules_output_length,
      claude37_p2_rules_fs_output_length: claude37_p2_rules_fs_output_length,
      claude37_p2_duration_ms: claude37_p2.durationMs,
      claude37_p2_rules_duration_ms: claude37_p2_rules.durationMs,
      claude37_p2_rules_fs_duration_ms: claude37_p2_rules_fs.durationMs,
      claude37_p2_input_tokens: claude37_p2.parsed?.usage?.input_tokens ?? null,
      claude37_p2_rules_input_tokens: claude37_p2_rules.parsed?.usage?.input_tokens ?? null,
      claude37_p2_rules_fs_input_tokens: claude37_p2_rules_fs.parsed?.usage?.input_tokens ?? null,
      claude37_p2_output_tokens: claude37_p2.parsed?.usage?.output_tokens ?? null,
      claude37_p2_rules_output_tokens: claude37_p2_rules.parsed?.usage?.output_tokens ?? null,
      claude37_p2_rules_fs_output_tokens: claude37_p2_rules_fs.parsed?.usage?.output_tokens ?? null
    });

    processedReceiptIds.add(r.receipt_id);
  }

  fs.mkdirSync(path.dirname(outputResultsPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputPromptsPath), { recursive: true });
  fs.writeFileSync(outputResultsPath, Papa.unparse(categorisationRows));
  fs.writeFileSync(outputPromptsPath, Papa.unparse(promptRows));

  console.log(`\nDone. Saved ${categorisationRows.length} item rows to ${outputResultsPath}`);
  console.log(`Saved ${promptRows.length} receipt rows to ${outputPromptsPath}`);
}

main().catch((err) => {
  console.error("Error in orchestrator:", err);
  process.exit(1);
});




// Helper Moethods
function stringifyReceiptForPrompt(receipt: any): string {
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
    result += `Item${items.length > 1 ? 's' : ''}:\n`;

    const rawTotal = typeof receipt.total === "string"
      ? receipt.total.replace(/[^0-9.\-]/g, "").trim()
      : receipt.total;
    const totalNum = parseFloat(rawTotal);
    const total = isNaN(totalNum) ? "0.00" : totalNum.toFixed(2);

    result += `[ITEM #1]: "${receipt.vendor}" - $${total} x ${1}\n`;
  }
  return result.trim();
}

function extractCategoriesFromModelResponse(responseBody: string): string[] {
  try {
    const parsed = JSON.parse(responseBody);

    // Claude structure
    if (parsed.content && Array.isArray(parsed.content)) {
      const textEntry = parsed.content.find((c: any) => c.type === "text");
      if (textEntry?.text) {
        try {
          const innerParsed = JSON.parse(textEntry.text);
          if (Array.isArray(innerParsed)) {
            return innerParsed.map((s) => s.trim());
          }
        } catch {
          return textEntry.text
            .replace(/[\[\]"]+/g, "")
            .split(",")
            .map((s: string) => s.trim());
        }
      }
    }

  } catch (e) {
    const match = responseBody.match(/Categories?:\s*\[([^\]]+)\]/i);
    if (match) return match[1].split(",").map((s) => s.trim());
  }
  return [];
}

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
