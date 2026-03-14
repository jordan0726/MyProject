# ReceiptCAT Product Suite 🚀

This directory contains the core implementation of ReceiptCAT, organized into three coordinated modules. Each module is specialized to handle a specific layer of the application, from cloud infrastructure to the user interface.


> [!IMPORTANT]
> **Cloud Usage & Billing**: Deploying this project to AWS will provision real cloud resources (e.g., Bedrock, DynamoDB, Cognito) that may incur charges. Please monitor your **AWS Billing Dashboard** and ensure you understand the pricing for each service before deployment.
>
> **Live Demo**: Due to the associated cloud costs of maintaining a serverless environment, a live hosted version is not permanently available. For a full walkthrough of the platform, please refer to the **[P000340SE-demo.pdf](../Documentation/P000340SE-demo.pdf)** in the Documentation folder.

---

## 📂 Modules Overview

| Module | Description | Key Technologies |
|:-------|:------------|:-----------------|
| **[receiptcat-frontend/](./receiptcat-frontend/)** | Next.js client-side application. | React, Next.js, TypeScript |
| **[receiptcat-backend/](./receiptcat-backend/)** | Serverless API and business logic. | AWS Lambda, API Gateway, Python/Node.js |
| **[receiptcat-infra/](./receiptcat-infra/)** | Infrastructure as Code (IaC) and CI/CD. | AWS CDK, CodePipeline, CloudFormation |

---

## 🛠 Orchestration & Workflow

To ensure the system is correctly integrated, please follow the deployment and configuration sequence below:

### 1. Infrastructure Provisioning (`receiptcat-infra`)
Before running the application, you must provision the foundational AWS resources.
- **Action**: Follow the setup in [receiptcat-infra/README.md](./receiptcat-infra/).
- **Resources**: Configures **Cognito** (Auth), **DynamoDB** (Database), **S3** (Storage), and **CI/CD Pipelines**.

### 2. Backend Deployment (`receiptcat-backend`)
Once the infrastructure is ready, deploy the serverless functions.
- **Action**: Follow the steps in [receiptcat-backend/README.md](./receiptcat-backend/).
- **Resources**: Deploys API endpoints and integrates with **AWS Bedrock** and **Textract**.

### 3. Frontend Development (`receiptcat-frontend`)
Finally, connect the UI to your deployed backend.
- **Action**: Follow the guidance in [receiptcat-frontend/README.md](./receiptcat-frontend/).
- **Resources**: Local development server setup and production build deployment.

---

## 🔑 Data & Security Notes
- **Environment Secrets**: Sensitive data management (database endpoints, service credentials, etc.) is documented in [DATA_MANAGEMENT](https://github.com/jordan0726/MyProject/blob/master/ReceiptCAT/ReceiptCAT-Product/DATA_MANAGEMENT.md) located in this directory. 
- **User Authentication**: All modules rely on the centralized **Cognito User Pool** created by the infra module.

---

## 🧪 Quality Assurance
All modules are integrated into our automated CI/CD workflow. 
- **Unit Testing**: Powered by **Jest**.
- **Target Coverage**: **95.4%** across the entire product suite.
