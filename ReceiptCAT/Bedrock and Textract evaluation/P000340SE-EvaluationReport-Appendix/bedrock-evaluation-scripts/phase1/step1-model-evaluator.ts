import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

import { SYSTEM_PROMPT_CLAUDE, PROMPT_TEMPLATE_MIXTRAL } from "./prompt"

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

const buildClaudePayload = (receiptText: string) => ({
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  system: SYSTEM_PROMPT_CLAUDE,
  messages: [{ role: "user", content: [{ type: "text", text: `<receipt>\n${receiptText}\n</receipt>` }] }],
});

const buildMistralPayload = (receiptText: string, length: number) => {
  const prompt = `${PROMPT_TEMPLATE_MIXTRAL}(${length} item${length > 1 ? 's' : ''}), starting immediately with \`[\` and ending with \`]\`.\nDo not include item numbers, prices, commentary, or receipt text.\n\n<receipt>\n${receiptText}\n</receipt>`;
  return {
    prompt,
    max_tokens: 2048,
  };
};

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
  const outputResultsPath = path.resolve("data/bedrock_eval/phase1/step1_model_eval/bedrock_output_phase1_eval_results_s.csv");
  const outputPromptsPath = path.resolve("data/bedrock_eval/phase1/step1_model_eval/bedrock_output_phase1_prompt_token_results.csv");

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

    // if (processedReceiptIds.has(r.receipt_id)) {
    //   console.log(`    Skipping already processed receipt_id: ${r.receipt_id}`);
    //   continue;
    // }

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
    } else if (processedReceiptIds.has(r.receipt_id)) {
      console.log(`    Skipping already processed receipt_id: ${r.receipt_id}`);
      continue;
    }

    const receiptText = stringifyReceiptForPrompt(r);

    // Build payloads
    const claudePayload = buildClaudePayload(receiptText);
    const mistralPayload = buildMistralPayload(receiptText, r.items.length);

    // Call models
    const [claude37, claude4, mixtral, mistral7b] = await Promise.all([
      timedCall("apac.anthropic.claude-3-7-sonnet-20250219-v1:0", claudePayload),
      timedCall("apac.anthropic.claude-sonnet-4-20250514-v1:0", claudePayload),
      timedCall("mistral.mixtral-8x7b-instruct-v0:1", mistralPayload),
      timedCall("mistral.mistral-7b-instruct-v0:2", mistralPayload),
    ]);
    // console.log("CLAUDE PAYLOAD:", claudePayload);
    // console.log("MISTRAL PAYLOAD:", mistralPayload);

    // console.log('RAW CLAUDE OUTPUT', claude37.raw);
    // console.log('RAW MISTRAL OUTPUT', mixtral.raw);

    // Extract categories
    const claude37RawCats = extractCategoriesFromModelResponse(claude37.raw);
    const claude4RawCats = extractCategoriesFromModelResponse(claude4.raw);
    const mixtralRawCats = extractCategoriesFromModelResponse(mixtral.raw);
    const mistral7bRawCats = extractCategoriesFromModelResponse(mistral7b.raw);

    // console.log('RAW CLAUDE CATS', claude37RawCats);
    // console.log('RAW MISTRAL CATS', mixtralRawCats);

    const claude37Cats = mapCategoriesToValues(claude37RawCats);
    const claude4Cats = mapCategoriesToValues(claude4RawCats);
    const mixtralCats = mapCategoriesToValues(mixtralRawCats);
    const mistral7bCats = mapCategoriesToValues(mistral7bRawCats);

    // Record output lengths for each model's categories
    const claude37_output_length = claude37RawCats.length;
    const claude4_output_length = claude4RawCats.length;
    const mixtral_output_length = mixtralRawCats.length;
    const mistral7b_output_length = mistral7bRawCats.length;

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
        claude37_output: claude37Cats[idx] ?? "",
        claude4_output: claude4Cats[idx] ?? "",
        mixtral_output: mixtralCats[idx] ?? "",
        mistral7b_output: mistral7bCats[idx] ?? "",
        claude37_raw_item_output: claude37RawCats[idx] ?? "",
        claude4_raw_output: claude4RawCats[idx] ?? "",
        mixtral_raw_output: mixtralRawCats[idx] ?? "",
        mistral7b_raw_output: mistral7bRawCats[idx] ?? ""
      });
    }

    // Receipt-level logging for prompts + tokens, and model output lengths
    promptRows.push({
      receipt_id: r.receipt_id,
      receipt_date: r.date,
      receipt_s3_path: r.s3_path,
      receipt_vendor: r.vendor,
      receipt_total: r.total,
      claude37_input_prompt: `${claudePayload.system}\n${claudePayload.messages[0].content[0].text}`,
      claude4_input_prompt: `${claudePayload.system}\n${claudePayload.messages[0].content[0].text}`,
      mixtral_input_prompt: mistralPayload.prompt,
      mistral7b_input_prompt: mistralPayload.prompt,
      claude37_raw_output: claude37.parsed.content[0].text,
      claude4_raw_output: claude4.parsed.content[0].text,
      mixtral_raw_output: mixtral.parsed.outputs[0].text,
      mistral7b_raw_output: mistral7b.parsed.outputs[0].text,
      ground_truth_item_count: r.items.length,
      claude37_output_length: claude37_output_length,
      claude4_output_length: claude4_output_length,
      mixtral_output_length: mixtral_output_length,
      mistral7b_output_length: mistral7b_output_length,
      claude37_duration_ms: claude37.durationMs,
      claude4_duration_ms: claude4.durationMs,
      mixtral_duration_ms: mixtral.durationMs,
      mistral7b_duration_ms: mistral7b.durationMs,
      claude37_input_tokens: claude37.parsed?.usage?.input_tokens ?? null,
      claude4_input_tokens: claude4.parsed?.usage?.input_tokens ?? null,
      claude37_output_tokens: claude37.parsed?.usage?.output_tokens ?? null,
      claude4_output_tokens: claude4.parsed?.usage?.output_tokens ?? null
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

function safeExtractArray(text: string): string[] {
  // Find the first [...] block in the text using regex
  const match = text.match(/\[[^\[\]]*\]/);
  if (!match) {
    return [];
  }
  const arrayString = match[0];
  try {
    const parsed = JSON.parse(arrayString);
    if (Array.isArray(parsed)) {
      return parsed.map((s: string) => typeof s === "string" ? s.trim() : String(s).trim());
    }
  } catch {
    // fallback: strip brackets/quotes and split by comma, trim each entry
    return arrayString
      .replace(/^[\[]|[\]]$/g, "") // remove brackets at start/end
      .replace(/^["']|["']$/g, "") // remove quotes at start/end
      .split(",")
      .map((s) => s.trim());
  }
  return [];
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

    // Mistral structure
    if (parsed.outputs && Array.isArray(parsed.outputs)) {
      const textEntry = parsed.outputs.find((o: any) => o.text);
      if (textEntry?.text) {
        return safeExtractArray(textEntry.text);
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
    "Fresh Produce": "fresh_produce",
    "Meat & Seafood": "meat_seafood",
    "Dairy & Eggs": "dairy_eggs",
    "Pantry & Snacks": "pantry_snacks",
    "Bakery": "bakery",
    "Coffee & Tea": "coffee_tea",
    "Beverages": "beverages",
    "Alcohol": "alcohol",
    "Eating Out": "eating_out",
    "Health & Medicine": "health_medicine",
    "Personal Care & Beauty": "personal_care_beauty",
    "Home & Cleaning": "home_cleaning",
    "Baby & Maternity": "baby_maternity",
    "Pets": "pets",
    "Clothing & Footwear": "clothing_footwear",
    "Electronics & Tech": "electronics_tech",
    "Stationery & Office": "stationery_office",
    "Sports & Fitness": "sports_fitness",
    "Gifts & Occasions": "gifts_occasions",
    "Entertainment": "entertainment",
    "Subscriptions & Digital Services": "subscriptions_digital",
    "Professional Services": "professional_services",
    "Utilities & Bills": "utilities_bills",
    "Transport & Fuel": "transport_fuel",
    "Travel & Holidays": "travel_holidays",
    "Other": "other",
  };

  return categories.map((category) => mapping[category.trim()] ?? "other");
}
