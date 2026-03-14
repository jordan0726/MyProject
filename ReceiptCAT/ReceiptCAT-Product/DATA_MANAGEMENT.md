# 📊 ReceiptCAT Technical Data Specifications

This document outlines the infrastructure components, data storage patterns, and security protocols for the ReceiptCAT ecosystem. These specifications are designed to ensure consistency across `feature`, `dev`, and `prod` stages.

## 1. Primary Data Store: Amazon DynamoDB
ReceiptCAT utilizes **Amazon DynamoDB** as its fully managed NoSQL key-value store.

* **API Version**: `2012-08-10` (AWS SDK standard).
* **AWS Region**: `ap-southeast-2` (Default).
* **Service Endpoint**: Dynamic (Resolved by AWS SDK based on the configured region).
* **Table Naming Convention**: `receiptcat-backend-<stage>-receipts`
    * *Note: `<stage>` typically refers to `feature`, `dev`, or `prod`.*
* **Key Schema**:
    * **Partition Key (PK)**: `user_id` (String)
    * **Sort Key (SK)**: `receipt_id` (String)
* **Global Secondary Index (GSI)**:
    * **Index Name**: `user_date-index`
    * **Structure**: Partition Key `user_id`, Sort Key `date` (supports chronological queries).
* **Capacity Management**: Provisioned with auto-scaling enabled (Target utilization: 70%).

### Data Access & Governance
- **Backend Access**: Lambda functions resolve table names via the `RECEIPTS_TABLE` environment variable.
- **Frontend Access**: **Direct database access from the frontend is strictly prohibited.** All data must be proxied through API Gateway and Backend Lambda functions.
- **IAM Strategy**: Least-privilege access is enforced using scoped `grant*` calls within the AWS CDK stacks.

---

## 2. Supporting Infrastructure

### Object Storage: Amazon S3
* **Bucket Purpose**: Stores raw and processed receipt images.
* **Naming Pattern**: `receiptcat-backend-<stage>-receipts`
* **Security & Lifecycle**:
    * Enforced TLS and S3-managed server-side encryption.
    * Configured with versioning and lifecycle rules (e.g., auto-expiration for temporary objects).
    * CORS policies are applied to allow authorized frontend origins.

### Asynchronous Messaging: Amazon SNS
* **Topic Name Pattern**: Typically `receiptcat-backend-<stage>-receipt-topic` (Verify exact name in AWS Console/CDK Outputs).
* **Role**: Orchestrates events between microservices (e.g., triggering categorization after extraction).

---

## 3. Security & Connectivity

### Identity & Access Management (IAM)
- **Zero Static Credentials**: No database passwords or long-term IAM Secret Keys are stored within the code. Access is granted via **IAM Roles** assigned to specific AWS resources.
- **User Authentication**: Managed via **Amazon Cognito**.
    - Configuration is injected via `USER_POOL_ID` and OIDC-related environment variables.

### Operational Access
To perform manual maintenance or troubleshooting:
1.  **Credentials**: Use temporary sessions via AWS SSO or IAM Users with Multi-Factor Authentication (MFA).
2.  **AWS CLI**: Ensure your profile is configured for the correct region:
    ```bash
    aws dynamodb describe-table --table-name <your-table-name> --region ap-southeast-2
    ```
3.  **Validation**: Always verify the current deployment stage (`feature`, `dev`, or `prod`) before executing write/delete operations.

---

## 🧪 Testing & Quality
- **Unit Testing**: Standardized via **Jest**.
- **Code Coverage**: Aiming for **>95%** coverage across core logic to ensure data integrity during schema migrations or infrastructure updates.
