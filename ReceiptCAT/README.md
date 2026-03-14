# ReceiptCAT 🐾

![Logo](https://github.com/jordan0726/MyProject/blob/master/ReceiptCAT/Images/receiptcat_logo%2Bslogan-02-02.jpg)

## 📌 Overview
**ReceiptCAT** is a full-stack **AWS Serverless** web application designed to simplify personal expense management. By leveraging **AWS Bedrock (Generative AI)**, the platform automatically extracts line items from uploaded receipts and categorizes them into predefined expense categories.

Beyond being a functional tool, this repository includes a rigorous **AI Performance Evaluation** comparing different cloud services (Bedrock vs. Textract) in terms of accuracy, cost-efficiency, and service key-findings.

---

## 📂 Project Structure

- **[ReceiptCAT-Product](./ReceiptCAT-Product)**: The core application source code.
  - **Frontend**: Interactive UI built with **React**, **Next.js**, and **TypeScript**, hosted on S3+Cloudfront.
  - **Backend**: Serverless logic powered by **AWS Lambda**, **API Gateway**, and **S3**.
  - **Infrastructure**: Cloud resources managed via **AWS CDK (Cloud Development Kit)**.
- **[Bedrock and Textract Evaluation](./Bedrock%20and%20Textract%20evaluation)**: Research and analytical reports.
  - **Price Comparison**: Cost analysis between AI models and OCR services.
  - **Performance Metrics**: Accuracy and latency benchmarks for data extraction.
- **[Documentation](./Documentation)**: Technical specifications, architecture diagrams, and user guides.
- **[Design](./Design)**: UI/UX assets and brand identity (Currently under organization 🚧).
  - Includes **Figma** high-fidelity mockups and **Adobe Illustrator** source files for the logo and brand assets.

---

## ✨ Key Features

* **AI-Driven Extraction**: Seamlessly extracts merchants, line items, and totals from receipt images using **AWS Bedrock (Claude)**.
* **Smart Classification**: Automatically assigns expenses to **26 predefined categories** for better financial tracking.
* **Dynamic Expense Analytics**:
    * **Interactive Visualization**: View spending habits through dynamic **Pie Charts** on the Dashboard.
    * **Custom Filters**: Tailor insights by including or excluding specific categories or timeframes.
* **Manual Refinement**: Includes a manual override feature to correct extraction results, ensuring 100% data integrity.
* **Secure Authentication**: Robust user management and data isolation powered by **Amazon Cognito**.
* **Enterprise-Grade CI/CD**: Fully automated deployment pipeline ensuring high code quality.
* **High Reliability**: Verified with a **95.4% Unit Test Coverage** using **Jest**.

---

## 🛠 Tech Stack

* **Frontend**: React, Next.js, TypeScript
* **Backend & Serverless**: 
    * **Compute**: AWS Lambda, Amazon API Gateway
    * **Auth & User Management**: **Amazon Cognito**
    * **Database**: **Amazon DynamoDB** (NoSQL)
    * **Storage**: Amazon S3
* **Artificial Intelligence**: **AWS Bedrock (Claude)**, AWS Textract
* **Infrastructure as Code (IaC)**: **AWS CDK**
* **CI/CD & DevOps**: 
    * **Source Control**: AWS CodeCommit
    * **Pipeline**: AWS CodePipeline
    * **Build**: AWS CodeBuild
* **Testing**: **Jest** (Current Coverage: **95.4%**)

---

## 🚀 Quick Start

*(Detailed setup instructions for the infrastructure and local development will be provided soon once the environment configuration is finalized.)*
