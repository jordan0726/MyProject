ReceiptCat Data Management
==========================

Primary Operational Store
-------------------------
- Type: Amazon DynamoDB (fully managed NoSQL key-value store).
- API version: 2012-08-10 (AWS SDK default for DynamoDB in this project).
- AWS region & endpoint: ap-southeast-2 (`https://dynamodb.ap-southeast-2.amazonaws.com`).
- Table naming pattern: `receiptcat-backend-<stage>-receipts` where `<stage>` is `feature`, `dev`, or `prod`. Current active deployment uses the `feature` stage.
- Key schema: partition key `user_id` (string) and sort key `receipt_id` (string).
- Global secondary index: `user_date-index` (`user_id` partition key, `date` sort key) for chronological queries.
- Capacity mode: provisioned with auto-scaling (min 1 / max 10 RCUs and WCUs; target utilization 70%).
- Provisioning & configuration source: `receiptcat-infra/lib/backend/stacks/backend-infra-stack.ts`.
- Access path: backend Lambda functions resolve the table name from the `RECEIPTS_TABLE` environment variable and access via the AWS SDK (`@aws-sdk/client-dynamodb`).
- Authorization: IAM roles attached to Lambda functions (`receiptExtractor`, `receiptCategorizer`, `dashboard`, `receiptHistory`, `receiptDetails`, `updateReceipt`) grant scoped read or read/write access using `receiptsTable.grant*` calls in the CDK stack. No direct access from the frontend; calls must go through API Gateway + Lambda.
- Connectivity for operators: use AWS Console, AWS CLI (`aws dynamodb ... --region ap-southeast-2`), or SDKs with credentials that have DynamoDB permissions for the target stage.

Supporting Data Stores
----------------------
- Receipt object storage: Amazon S3 bucket named `receiptcat-backend-<stage>-receipts` (same `<stage>` convention) with TLS enforcement, S3-managed encryption, versioning, lifecycle rules, and CORS for the deployed frontend. Uploads are tagged and auto-expire for tmp objects. Bucket access is restricted to backend Lambdas via IAM policies.
- Messaging topic: Amazon SNS topic `receiptcat-backend-<stage>-receipt-topic` relays processing events between services; only backend Lambdas are subscribed/publish.

Credentials & Secrets
---------------------
- No static database passwords are stored; access relies on AWS IAM roles provisioned via CDK.
- Application authentication is handled through Amazon Cognito (`USER_POOL_ID`, `NEXT_PUBLIC_OIDC_*` env vars). These values live in deployment templates and the frontend `.env` files but do not grant direct database access.
- Operator credentials: obtain temporary credentials (e.g., AWS SSO or IAM user) with DynamoDB/S3 access scoped to the relevant stage before performing data operations.
