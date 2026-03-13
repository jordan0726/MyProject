ReceiptCat Project Overview
===========================

ReceiptCat is split into three coordinated codebases within this repository. Use the module-level READMEs for detailed setup and workflow guidance.

- receiptcat-frontend/ — Next.js frontend client. See `receiptcat-frontend/README.md` for development, testing, and release notes.
- receiptcat-backend/ — Serverless backend (AWS Lambda + API Gateway). See `receiptcat-backend/README.md` for architecture, APIs, and deployment steps.
- receiptcat-infra/ — AWS CDK infrastructure-as-code. See `receiptcat-infra/README.md` for provisioning pipelines and shared resources.

Getting Started
---------------
1. Begin with `receiptcat-infra/README.md` to provision Cognito, DynamoDB, S3, and CI/CD pipelines.
2. Move to `receiptcat-backend/README.md` to configure and deploy backend functions.
3. Finish with `receiptcat-frontend/README.md` for local frontend development and deployment guidance.

Additional Resources
--------------------
- Data management specifics (database endpoints, credentials, access paths) are documented in `data.txt` alongside this file.

