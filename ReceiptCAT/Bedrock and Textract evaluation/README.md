# AI Model Evaluation: Bedrock vs. Textract 📊

This directory contains in-depth benchmarking reports conducted during **Semester 2, 2025 (RMIT University)**. These studies directly influenced the architectural decisions of ReceiptCAT by comparing Generative AI capabilities against traditional OCR precision.

---

## 📑 Evaluation Report #1: Amazon Bedrock (The Intelligence Layer)
**[Full Report: Bedrock Evaluation](https://github.com/jordan0726/MyProject/blob/master/ReceiptCAT/Bedrock%20and%20Textract%20evaluation/P000340SE-EvaluationReport-Bedrock-1.pdf)**

This report evaluates foundational models through AWS Bedrock as a "Semantic Categorizer" to solve the complex challenge of expense classification.

### 🔍 Detailed Experimental Setup
* **Models Tested**: Evaluated proprietary models like Claude 3.7 Sonnet and Claude 4 Sonnet alongside open-weight models like Mixtral 8x7B and Mistral 7B [236]. Claude 3.7 Sonnet was ultimately recommended for its balance of accuracy, stability, and cost [730, 734].
* **Prompt Engineering Strategy**: 
    - Utilised a two-part prompt structure for Claude models, separating the system message containing the task, schema, and constraints from the user message containing the serialised receipt text [288].
    - Constrained the model by explicitly including the predefined list of categories directly within the prompt to reduce ambiguity and enforce schema adherence [290, 291].
    - Required the output to be formatted strictly as a JSON array whose length matched the exact number of detected receipt items [294, 508].
    - Iteratively tested prompt variants: a baseline, updated category lists, added explicit disambiguation rules (e.g., separating refrigerated goods from shelf-stable pantry snacks), and few-shot examples [503, 504, 505, 506, 507].
    - Determined that combining updated categories with explicit rules (without few-shot examples) provided the best accuracy-to-cost balance, as few-shot examples increased input token costs without clear performance gains [728, 733].
* **Core Metric**: Used **Balanced Accuracy** (averaging per-category accuracies) to ensure performance was fairly measured across all categories, preventing high-frequency data from masking weaknesses in low-frequency categories [393, 438].

### 💡 Specific Technical Insights
* **Semantic Inference**: The report proves Bedrock can use contextual clues and explicit prompt rules to properly classify ambiguous personal or household items and distinguish drinkable liquids from pantry items [514, 515].
* **Zero-Shot Reliability**: The Claude 3.7 Sonnet model achieved perfect array-length consistency with no mismatches against the ground-truth item count, eliminating downstream parsing errors [447].
* **Data Scarcity Analysis**: Identified specific "data-scarce" categories like "Baby & Maternity", "Entertainment", and "Transport & Fuel" that require future dataset expansion to improve the reliability of balanced accuracy metrics [277, 742, 743].
* **Conclusion**: Claude 3.7 Sonnet was selected as the receipt categoriser model because it consistently achieved high performance and output stability while keeping token usage and runtime within reasonable limits [735, 736].

---

## 📑 Evaluation Report #2: Amazon Textract (The Baseline Layer)
**[Full Report: Textract Evaluation](https://github.com/jordan0726/MyProject/blob/master/ReceiptCAT/Bedrock%20and%20Textract%20evaluation/P000340SE-EvaluationReport-Textract-1.pdf)**

This report assesses the precision of **Amazon Textract’s AnalyzeExpense API**, which converts receipt images into structured JSON output containing SummaryFields and LineItemGroups [46, 54, 55].

### 🔍 Detailed Experimental Setup
* **Field Precision Tracking**: Evaluated how effectively the API could detect and extract essential fields such as vendor names, total amounts, and dates across multiple receipt formats [47, 48].
* **Regional Context**: Tested against 118 receipts sourced from Australian vendors, captured via various smartphones or screenshots, representing naturally mixed image conditions [65, 66, 70, 74].

### 💡 Specific Technical Insights
* **Normalization Conflict**: The study found that Textract returns dates in inconsistent formats (e.g., "16 Apr 2025", "07/04/25", and "2025-09-12") [142]. This directly led to the implementation of date standardisation logic (YYYY-MM-DD) in the `receiptExtractor` Lambda function [184, 185, 189].
* **Missing Field Handling**: Identified that Textract occasionally misidentifies or fails to detect vendor names when images are blurry, angled, or shadowed [145, 158]. This finding justified injecting default values for missing required fields to ensure continuity of downstream processing [186, 187, 189].
* **Operational Impact**: These results were the primary driver for updating the `receiptExtractor` Lambda function to include normalisation and default placeholders, allowing users to later correct the data using the Edit feature in ReceiptCAT [173, 187, 189].
* **Conclusion**: Textract consistently identified totals and forms a solid extraction foundation when complemented with appropriate post-processing and validation logic [176, 180].

---

## ⚖️ Strategic Comparison Summary

| Feature | Amazon Bedrock (LLM) | Amazon Textract (OCR) |
| :--- | :--- | :--- |
| **Architectural Role** | **Core Intelligence** (Classification) | **Data Baseline** (Raw Extraction) |
| **Data Handling** | Self-normalizes via Prompt instructions | Requires manual Regex/Logic normalization |
| **Advantage** | Understands "What" was bought (Context) | Precise at "How much" it cost (Raw data) |
| **Error Handling** | Semantic fallback for ambiguous data | Direct feedback to Manual Edit UI |

---

## 🚀 How This Research Shaped ReceiptCAT
1.  **Hybrid Pipeline**: We established a two-stage flow: **Textract** captures the raw baseline fields [46], while **Bedrock** provides the intelligent structure and predefined category classification [228].
2.  **Logic Offloading**: Based on the Bedrock report, we moved complex disambiguation rules directly into AI System Prompts, improving system maintainability while controlling token costs [516, 725].
3.  **Resilience Design**: The Textract failure analysis directly shaped our "Default Value" strategy within the Lambda backend, ensuring the system remains stable and searchable even during OCR processing errors [186, 189].
