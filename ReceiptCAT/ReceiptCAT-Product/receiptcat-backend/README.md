# ReceiptCAT – Backend

## Overview
The **ReceiptCAT Backend** provides RESTful API endpoints for managing and viewing user receipts and analytics.  
It supports the ReceiptCAT web client by retrieving receipt data, computing insights, and updating stored metadata.

> **Note:** Local development and manual backend testing are **not supported**.  
> All builds, tests, and deployments are handled through the **ReceiptCAT Infra repository**.

---

## Architecture
This backend is built as a **serverless TypeScript application** deployed via **AWS Lambda** and **API Gateway**, integrating with AWS services:

| Component | Purpose |
|------------|----------|
| **AWS Lambda** | Hosts API logic for each endpoint |
| **API Gateway** | Exposes endpoints securely |
| **DynamoDB** | Stores receipt and user data |
| **S3** | Stores receipt images |
| **Cognito** | Handles user authentication |
| **Infra Repository** | Manages CI/CD, deployment, and configuration |

---

## Project Structure
```
src/
├─ lambda/
│  ├─ dashboard/
│  │  └─ index.ts
│  ├─ presign-upload/
│  │  └─ index.ts
│  ├─ receipt-categorizer/
│  │  ├─ index.ts
│  │  └─ prompt.ts
│  ├─ receipt-details/
│  │  └─ index.ts
│  ├─ receipt-extractor/
│  │  └─ index.ts
│  ├─ receipt-history/
│  │  └─ index.ts
│  ├─ update-receipt/
│  │  └─ index.ts
│  ├─ handler.ts
│  └─ prompt.ts
├─ lib/
│  └─ receiptsUtils.ts
└─ poc/
```

## Scripts

The following npm scripts are defined in the `package.json` and are used to build, test, and maintain the backend codebase.  
They streamline common developer tasks such as compiling TypeScript, running tests, linting, and formatting code.


| Command | Description |
|----------|--------------|
| `npm install` | Install dependencies |
| `npm run build` | Transpile TypeScript to JavaScript |
| `npm run lint` | Run ESLint checks |
| `npm run test` | Run Jest unit tests |
| `npm run test:ci` | Run Jest in CI mode with coverage |
| `npm run format` | Format code using Prettier |

---

## Test Execution

Tests are written using **Jest** and executed automatically in **AWS CodeBuild** as part of the CI/CD pipeline.  
Developers can also run them manually if needed before committing.

| Command | Purpose |
|----------|----------|
| `npm run test` | Runs all Jest tests locally |
| `npm run test:ci` | Executes Jest tests with coverage (used in CodeBuild) |


## Deployment

> **Note:** No local development for backend.  
> The backend cannot be run locally and is deployed entirely through the **Infrastructure repository**.  
> Refer to the [infra repository](../RECEIPTCAT-INFRA/README.md) for detailed deployment instructions and information on how to trigger, monitor, and manage deployments.

The backend is deployed using **AWS services** as part of a fully managed serverless architecture:
- **AWS Lambda** – hosts the API logic
- **Amazon API Gateway** – exposes the RESTful endpoints
- **Amazon DynamoDB** – serves as the database for receipts and user data
- **Amazon Cognito** – handles authentication and authorization
- **Amazon S3** – stores uploaded receipt images and extracted data

### Deployment Workflow

All deployments are automated using **AWS CodePipeline** integrated with:
- **AWS CodeCommit** – stores the backend source code
- **AWS CodeBuild** – runs build and test stages (using `npm run test:ci`)
- **AWS CodeDeploy / CloudFormation** – handles packaging and deployment to AWS Lambda

---

## Environment Variables

> **Note:** Environment variables for the backend are fully managed in the **Infrastructure repository**.  
> Do not attempt to configure these manually in the Lambda console; refer to the infra repository for deployment and configuration.

The following environment variables are expected by the backend Lambdas:

| Variable | Description | Example |
|-----------|--------------|----------|
| `AWS_REGION` | AWS region where the backend is deployed | `ap-southeast-2` |
| `DYNAMODB_RECEIPTS_TABLE` | DynamoDB table for storing receipt metadata and extracted text | `ReceiptCAT-Receipts` |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID for user authentication | `ap-southeast-2_aBc123XYZ` |
| `COGNITO_CLIENT_ID` | Cognito App Client ID for user login from frontend | `6ghj8k1lmn2opqrs3tuv45wx` |
| `S3_BUCKET_NAME` | S3 bucket for storing uploaded receipt images | `receiptcat-uploads` |
| `BEDROCK_MODEL_ID` | Bedrock model ID for document analysis | `anthropic.claude-v2` |
| `LOG_LEVEL` | Optional logging level (`debug`, `info`, `warn`, `error`) | `info` |

## API Endpoints

All endpoints are deployed under the API Gateway URL provided in the deployment output.  
Each endpoint requires a valid **Cognito access token** for authentication.

---

### Retrieve aggregated dashboard data for a user

**Endpoint:**  
`GET /users/{userId}/dashboard?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

**Description:**  
Fetches aggregated receipt data for a specific user within a given date range.  
Returns total receipts count and grouped spending by category.

**Sample Request Body:**  
N/A

**Sample Response:**
```json
{
  "receiptsCount": 3,
  "categoryGroups": {
    "Bakery": 120.50,
    "Dairy & Eggs & Fridge": 45.00
  }
}
```
---

### Retrieve a list of receipts for a user

**Endpoint:**  
`GET /users/{userId}/receipts?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

**Description:**  
Retrieves all receipts for a user within the specified date range.
Useful for displaying receipt history or summaries on the frontend dashboard.

**Sample Request Body:**  
N/A

**Sample Response:**
``` json
{
  "receiptsCount": 3,
  "receipts": [
    {
      "receiptId": "R001",
      "date": "2025-10-01",
      "vendor": "SuperMart",
      "total": 45.75,
      "itemsCount": 2
    },
    {
      "receiptId": "R002",
      "date": "2025-10-02",
      "vendor": "Cafe24",
      "total": 12.30,
      "itemsCount": 1
    }
  ]
}
```
---

### Retrieve a single receipt’s details

**Endpoint:**  
`GET /users/{userId}/receipts/{receiptId}`

**Description:**  
Fetches the full details of a specific receipt, including its items.
If available, the response includes a signed S3 URL to access the uploaded receipt image securely.

**Sample Request Body:**  
N/A

**Sample Response:**
``` json
{
  "receiptId": "R001",
  "date": "2025-10-01",
  "vendor": "SuperMart",
  "total": 45.75,
  "items": [
    {
      "receiptId": "R001",
      "name": "Milk",
      "category": "Dairy & Eggs & Fridge",
      "price": 5.00,
      "quantity": 1,
      "purchasedAt": "2025-10-01"
    },
    {
      "receiptId": "R001",
      "name": "Bread",
      "category": "Bakery",
      "price": 2.50,
      "quantity": 1,
      "purchasedAt": "2025-10-01"
    }
  ],
  "image_url": "https://signed-url-from-s3"
}
```
---

### Update an existing receipt’s details

**Endpoint:**  
`PUT /users/{userId}/receipts/{receiptId}`

**Description:**  
Updates an existing receipt’s vendor name, total amount, or item list.
Used when editing extracted data after validation by the user.

**Sample Request Body:**  
``` json
{
  "vendor": "New Vendor",
  "total": 50.00,
  "items": [
    {
      "name": "Milk",
      "category": "Dairy & Eggs & Fridge",
      "price": 5.00,
      "quantity": 2
    },
    {
      "name": "Bread",
      "category": "Bakery",
      "price": 2.50,
      "quantity": 3
    }
  ]
}
```

**Sample Response:**
``` json
{
  "receiptId": "R001",
  "vendor": "New Vendor",
  "total": 50.00,
  "items": [
    {
      "name": "Milk",
      "category": "Dairy & Eggs & Fridge",
      "price": 5.00,
      "quantity": 2
    },
    {
      "name": "Bread",
      "category": "Bakery",
      "price": 2.50,
      "quantity": 3
    }
  ]
}
```