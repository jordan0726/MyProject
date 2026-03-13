# ReceiptCAT Textract Evaluation – Setup and Reproduction Guide

This document provides detailed instructions for deploying and running the **ReceiptCAT Textract Evaluation Stack**.  
It enables future teams to reproduce the evaluation environment, re-run the Textract extraction pipeline, and regenerate the same extracted data used in the evaluation.

## 1. Package Contents

| File / Folder | Description |
|----------------|-------------|
| `P000340SE-EvaluationReport-Appendix/textract-evaluation-infra` | AWS CDK application and Lambda source code for the evaluation stack. Deploying this creates the S3 bucket, event trigger, Lambda function, and DynamoDB table used for the extraction process. |
| `P000340SE-EvaluationReport-Appendix/data/textract_output_data.csv` | CSV file containing the extracted fields (vendor, date, total, and line items) generated from this evaluation. |
| `P000340SE-EvaluationReport-Appendix/data/textract_input_receipt_images.zip` | ZIP file containing the input receipt images used in this evaluation. |
| `P000340SE-EvaluationReport-Appendix/textract-analysis_appendix.pdf` | Visual appendix containing receipt examples and corresponding extracted data referenced in the evaluation report. |

## 2. Stack Overview

The AWS CDK stack included in `P000340SE-EvaluationReport-Appendix/textract-evaluation-infra` provisions all required components for reproducing the evaluation.  
Once deployed, the stack creates the following resources:

- **Amazon S3 Bucket (`receiptcat-textract-eval-receipts`)**  
  Stores receipt images. Uploading a new image automatically triggers the Lambda function through an S3 event notification.

- **AWS Lambda Function (`ExtractReceiptData`)**  
  Executes the Textract `AnalyzeExpense` API for each uploaded receipt, parses the returned data, and writes extracted fields to DynamoDB.

- **Amazon DynamoDB Table (`receiptcat_textract_eval_receipts`)**  
  Stores the structured extraction results for each receipt, including vendor name, date, total, and item details.

- **IAM Roles and Permissions**  
  Automatically configured to allow the Lambda function to read from S3 and write to DynamoDB.

## 3. Prerequisites

Before deploying the evaluation stack, ensure that the following tools and permissions are available:

- AWS account with permissions to deploy CDK applications.
- Node.js 20.x or later and AWS CDK v2 installed.
- AWS CLI configured with valid credentials and default region.

## 4. Deployment Steps

1. **Install Dependencies**  
   Install project dependencies:

   ```bash
   cd P000340SE-EvaluationReport-Appendix
   npm install
   ```

2. **Bootstrap the CDK Environment (first-time setup only)**  
   ```bash
   npx cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
   ```

3. **Deploy the Stack**  
   Deploy the CDK stack to provision all evaluation resources:

   ```bash
   npx cdk deploy ReceiptCatEvaluationTextractStack
   ```

   The stack creates the S3 bucket, S3-to-Lambda event trigger, Lambda function, and DynamoDB table.

4. **Upload Input Receipts**  
   Upload the receipt images located in `P000340SE-EvaluationReport-Appendix/data/textract_input_receipt_images.zip` to the provisioned S3 bucket (`receiptcat-textract-eval-receipts`, or your desired S3 bucket).  
   Each upload automatically invokes the Lambda function for processing.

5. **Verify Extraction Results**  
   Once processing is complete, verify that the extracted records have been written to the DynamoDB table (`receiptcat_textract_eval_receipts`, or your desired DynamoDB table).  
   Each item corresponds to a processed receipt and includes extracted vendor, date, total, and line-item information.

6. **Export to CSV**  
   After verifying that all receipts have been processed, manually export the DynamoDB records to a CSV file.  
   The resulting file should match the format of the provided `P000340SE-EvaluationReport-Appendix/data/textract_output_data.csv`.

7. **Cleanup: Destroy the Stack**  
   To cleanup and destroy the CDK stack and deprovision all evaluation resources:

   ```bash
   npx cdk destroy ReceiptCatEvaluationTextractStack
   ```

   The stack removes S3-to-Lambda event trigger and the Lambda function.
   The S3 bucket, DynamoDB table, and any related CloudWatch log groups are automatically retained to preserve any data. You can opt to manually remove these resources if you wish.

## 5. Notes for Future Evaluations

- The CDK stack can be redeployed or extended for future Textract model evaluations.  
- To test with a new dataset, upload additional receipts to the same bucket or deploy a new instance of the stack with a different name.  
- The Lambda logic that invokes Textract and parses responses is located at `P000340SE-EvaluationReport-Appendix/textract-evaluation-infra/lambda/ai-textract-eval.ts`.  
  It can be modified to extract additional fields or store data in an alternative schema before redeployment.  
- The evaluation used the synchronous `AnalyzeExpense` API.
- All scripts in this package are designed for reproducibility and to assist subsequent teams in continuing the Textract performance evaluation.

## 6. Version Information

| Item | Details |
|------|----------|
| **Date** | October 2025 |
| **Authors** | ReceiptCAT Development Team |
| **Region Tested** | ap-southeast-2 (Sydney) |
| **Textract API** | AnalyzeExpense |
| **Framework** | AWS CDK v2, Node.js 20.x |
