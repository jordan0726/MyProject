import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";

interface Row {
  ground_truth_category_p2: string;
  ground_truth_category_p2_alt: string;
  claude37_p2_output: string;
  claude37_p2_rules_output: string;
  claude37_p2_rules_fs_output: string;
}

interface Metrics {
  tp: number; // true positives
  fp: number; // false positives
  fn: number; // false negatives
}

function precision(tp: number, fp: number) {
  return tp + fp === 0 ? 0 : tp / (tp + fp);
}

function recall(tp: number, fn: number) {
  return tp + fn === 0 ? 0 : tp / (tp + fn);
}

function f1(p: number, r: number) {
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

function printCategoryAccuracyTable(rows: Row[], models: string[], categories: string[]) {
  console.log("\n=== Per-Category Accuracy ===");

  const orderedCategories = [
    "fruits_vegetables",
    "meat_seafood_deli",
    "dairy_eggs_fridge",
    "frozen",
    "pantry_snacks",
    "bakery",
    "coffee_tea",
    "drinks",
    "liquor",
    "eating_out",
    "health_medicine",
    "personal_care_beauty",
    "cleaning_maintenance",
    "baby_maternity",
    "pets",
    "clothing_footwear",
    "electronics_tech",
    "home_lifestyle",
    "sports_fitness",
    "gifts_occasions",
    "entertainment",
    "subscriptions_digital",
    "professional_services",
    "utilities_bills",
    "transport_fuel",
    "travel_holidays",
    "other"
  ];

  // Count total rows per category
  const categoryCounts: Record<string, number> = {};
  for (const cat of orderedCategories) {
    categoryCounts[cat] = 0;
  }
  for (const row of rows) {
    const truth = row.ground_truth_category_p2?.trim();
    if (truth && orderedCategories.includes(truth)) {
      categoryCounts[truth]++;
    }
  }

  // Dynamically calculate model column width
  const minModelColWidth = 10;
  const maxModelNameLength = models.reduce((max, m) => Math.max(max, m.length), 0);
  const modelColWidth = Math.max(minModelColWidth, maxModelNameLength + 2);

  const innerValueWidth = 6; // longest accuracy length e.g. "100.0%"
  const centerToWidth = (s: string, width: number) => {
    const total = width - s.length;
    const start = Math.floor(total / 2) + s.length;
    return s.padStart(start).padEnd(width);
  };

  // Print header
  const categoryColWidth = 26;
  const countColWidth = 6;
  const header = [
    "Category".padEnd(categoryColWidth),
    "Count".padStart(countColWidth),
    ...models.map(m => m.padStart(modelColWidth))
  ].join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const cat of orderedCategories) {
    const count = categoryCounts[cat];
    const accuracies = models.map(model => {
      if (count === 0) {
        // Center "N/A" within innerValueWidth, then center that within modelColWidth
        const naCentered = centerToWidth("  [N/A]", innerValueWidth);
        return centerToWidth(naCentered, modelColWidth);
      } else {
        let correct = 0;
        for (const row of rows) {
          const truth = row.ground_truth_category_p2?.trim();
          const alt_truth = row.ground_truth_category_p2_alt?.trim();
          if (truth === cat || (alt_truth && alt_truth === cat)) {
            const pred = (row as any)[model]?.trim();
            if (pred === truth) {
              correct++;
            }
          }
        }
        const accuracy = (correct / count) * 100;
        const accStr = accuracy.toFixed(1) + "%";
        // Right-pad to innerValueWidth then center within modelColWidth
        const accPadded = accStr.padStart(innerValueWidth);
        return centerToWidth(accPadded, modelColWidth);
      }
    });
    console.log(
      cat.padEnd(categoryColWidth) +
      " | " +
      count.toString().padStart(countColWidth) +
      " | " +
      accuracies.join(" | ")
    );
  }
}

function main() {
  const inputPath = path.resolve("data/bedrock_eval/phase2/step2_ground_truth_eval/bedrock_phase2_ground_truth_eval.csv");
  const csvData = fs.readFileSync(inputPath, "utf8");
  const rows: Row[] = Papa.parse<Row>(csvData, { header: true }).data;

  const models = ["claude37_p2_output", "claude37_p2_rules_output", "claude37_p2_rules_fs_output"];
  const categories = Array.from(new Set(rows.map(r => r.ground_truth_category_p2).filter(Boolean)));

  // metrics[model][category] = { tp, fp, fn }
  const metrics: Record<string, Record<string, Metrics>> = {};
  for (const model of models) {
    metrics[model] = {};
    for (const cat of categories) {
      metrics[model][cat] = { tp: 0, fp: 0, fn: 0 };
    }
  }

  // Count TP/FP/FN
  for (const row of rows) {
    const truth = row.ground_truth_category_p2?.trim();
    const alt_truth = row.ground_truth_category_p2_alt?.trim();
    if (!truth) continue;

    for (const model of models) {
      const pred = (row as any)[model]?.trim();

      // Updated logic: if pred == truth, increment TP for truth.
      // Else if pred == alt_truth, increment TP for alt_truth.
      // Else, increment FN for truth and FP for pred (if valid).
      if (pred === truth) {
        metrics[model][truth].tp++;
      } else if (alt_truth && pred === alt_truth) {
        metrics[model][alt_truth].tp++;
      } else {
        metrics[model][truth].fn++;
        if (categories.includes(pred)) {
          metrics[model][pred].fp++;
        }
      }
    }
  }

  // Per-category report
  for (const model of models) {
    console.log(`\n=== ${model} ===`);
    // Print header row with consistent padding
    console.log(
      "Category".padEnd(25) + " | " +
      "TP".padStart(4) + " | " +
      "FP".padStart(4) + " | " +
      "FN".padStart(4) + " | " +
      "Precision".padStart(9) + " | " +
      "Recall".padStart(6) + " | " +
      "F1".padStart(6)
    );
    console.log("-".repeat(25) + "-|-" + "-".repeat(4) + "-|-" + "-".repeat(4) + "-|-" + "-".repeat(4) + "-|-" + "-".repeat(9) + "-|-" + "-".repeat(6) + "-|-" + "-".repeat(6));

    let totalTp = 0, totalFp = 0, totalFn = 0;
    for (const cat of categories) {
      const { tp, fp, fn } = metrics[model][cat];
      const p = precision(tp, fp);
      const r = recall(tp, fn);
      const f = f1(p, r);
      totalTp += tp;
      totalFp += fp;
      totalFn += fn;
      console.log(
        cat.padEnd(25) + " | " +
        tp.toString().padStart(4) + " | " +
        fp.toString().padStart(4) + " | " +
        fn.toString().padStart(4) + " | " +
        (p * 100).toFixed(1).padStart(8) + "% | " +
        (r * 100).toFixed(1).padStart(5) + "% | " +
        (f * 100).toFixed(1).padStart(5) + "%"
      );
    }

    // Micro averages
    const microP = precision(totalTp, totalFp);
    const microR = recall(totalTp, totalFn);
    const microF = f1(microP, microR);

    // Macro averages
    const precisions = categories.map(c => precision(metrics[model][c].tp, metrics[model][c].fp));
    const recalls = categories.map(c => recall(metrics[model][c].tp, metrics[model][c].fn));
    const f1s = categories.map((_, i) => f1(precisions[i], recalls[i]));

    const macroP = precisions.reduce((a, b) => a + b, 0) / categories.length;
    const macroR = recalls.reduce((a, b) => a + b, 0) / categories.length;
    const macroF = f1s.reduce((a, b) => a + b, 0) / categories.length;

    console.log("\n--- Summary ---");
    console.log(
      "Metric".padEnd(15) + " | " +
      "Precision".padStart(9) + " | " +
      "Recall".padStart(6) + " | " +
      "F1".padStart(6) + " | " +
      "Accuracy".padStart(8)
    );
    console.log("-".repeat(15) + "-|-" + "-".repeat(9) + "-|-" + "-".repeat(6) + "-|-" + "-".repeat(6) + "-|-" + "-".repeat(8));
    console.log(
      "Micro Average".padEnd(15) + " | " +
      (microP * 100).toFixed(1).padStart(8) + "% | " +
      (microR * 100).toFixed(1).padStart(5) + "% | " +
      (microF * 100).toFixed(1).padStart(5) + "% | " +
      (microR * 100).toFixed(1).padStart(7) + "%"
    );
    console.log(
      "Macro Average".padEnd(15) + " | " +
      (macroP * 100).toFixed(1).padStart(8) + "% | " +
      (macroR * 100).toFixed(1).padStart(5) + "% | " +
      (macroF * 100).toFixed(1).padStart(5) + "% | " +
      (macroR * 100).toFixed(1).padStart(7) + "%"
    );

  }

  printCategoryAccuracyTable(rows, models, categories);
}

main();