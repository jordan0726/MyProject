
# ReceiptCAT - Infra

## Table of contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Important notes & manual prerequisites](#important-notes--manual-prerequisites)
- [End-to-end deployment workflow (dev)](#end-to-end-deployment-workflow-dev)
- [Project layout](#project-layout)
- [Environment & naming conventions](#environment--naming-conventions)
- [Bootstrapping your AWS account](#bootstrapping-your-aws-account)
- [Local setup](#local-setup)
- [Synth, Diff, Deploy, Destroy](#synth-diff-deploy-destroy)
- [Stacks & resources](#stacks--resources)
  - [Common (shared) stack](#common-shared-stack)
  - [BackendInfraStack](#backendinfrastack)
  - [BackendPipelineStack](#backendpipelinestack)
  - [Backend Dev/Prod/Feature Stage stacks & Pipeline stacks](#backend-devprodfeature-stage-stacks--pipeline-stacks)
  - [FrontendInfraStack](#frontendinfrastack)
  - [FrontendPipelineStack](#frontendpipelinestack)
  - [Frontend Dev/Prod/Feature Stage stacks & Pipeline](#frontend-devprodfeature-stage-stacks--pipeline)

## Overview
ReceiptCAT is a serverless, multi‑stack application for receipt categorisation. This repository (**receiptcat‑infra**) contains the AWS CDK IaC definitions for the shared/common, backend, and frontend infrastructure.

The design emphasises:
- **Serverless-first** (Lambda, API Gateway, DynamoDB, S3, SNS)
- **Separation of concerns** via distinct stacks for frontend and backend, and shared resources (common)
- **Environment isolation** (per‑stage resources for `dev`, `feature` and `prod`)
- **Automated CI/CD** for frontend and backend stacks
- **Single-command per‑stack deploys** (e.g., `cdk deploy receiptcat-common`, `cdk deploy receiptcat-backend-dev/infra`, `cdk deploy receiptcat-backend-dev/pipeline`, `cdk deploy receiptcat-frontend-dev/infra`, `cdk deploy receiptcat-frontend-dev/pipeline`)

## Prerequisites
- **Node.js** ≥ 20.x and **npm**
- **AWS CLI** v2 configured with credentials for the target account(s)
- **AWS CDK** v2 globally installed: `npm i -g aws-cdk`
- Appropriate IAM permissions to create/update/destroy the resources

## Important notes & manual prerequisites

### Externally managed Cognito User Pool (required)
This infra **assumes an existing Amazon Cognito User Pool** managed outside this repo.

- **User Pool ID (dev):** `ap-southeast-2_VpSug7NVk`
- **Configured in that pool:**
  - Hosted UI with the **ReceiptCAT managed sign-in** style
  - **Auth methods:** Custom email sign-in
  - **Federated IdPs:** Google (working) and Facebook (**known issue/buggy**)
  - **Hosted UI callback/sign-out URLs:** MUST include any intended frontend URLs/domains (see examples below)

**Where this is used:** The ID is passed to `CommonInfraStack` so the API Gateway authoriser can reference it.

**Where to change the User Pool ID**
- Update the `userPoolId` passed to `CommonInfraStack` in `bin/receiptcat-infra.ts`:
  ```ts
  const common = new CommonInfraStack(app, 'receiptcat-common', {
    env,
    app: APP_NAME,
    description: 'ReceiptCAT common resource stack',
    userPoolId: 'ap-southeast-2_VpSug7NVk' // <- replace with your pool id
  });
  ```
- Or, if you create a brand‑new User Pool, put the new **User Pool ID** here and re‑deploy the dependent stacks.

> **Note:** This infra currently does **not** manage Cognito User Pool creation to avoid accidental destructive changes to auth. The infra only reference its ID here.


## End-to-end deployment workflow (dev)

This is the recommended first-time deployment sequence for **dev** to ensure all cross-stack values and auth redirects are wired correctly.

### 0) Environment variables
Set your AWS account/region and (optionally) the frontend URL override.

```bash
CDK_DEFAULT_ACCOUNT=&lt;ACCOUNT_ID&gt;
CDK_DEFAULT_REGION=ap-southeast-2
# Optional: override the default; otherwise the app will use a placeholder until the first FrontendInfraStack deploy outputs the real value
FRONTEND_URL_DEV="https://placeholder-cloudfront-domain"
```

> The app reads `process.env.FRONTEND_URL_DEV` in `bin/receiptcat-infra.ts` to pass the current frontend URL to stacks that need it (e.g., backend CORS allow‑origins and public env).

### 1) Initial infra deploys
Deploy common resources, backend infra + pipeline + stage wrapper, *then* the frontend infra.

```bash
cdk deploy \
  receiptcat-common \
  receiptcat-backend-dev/infra \
  receiptcat-backend-dev/pipeline \
  receiptcat-backend-dev \
  receiptcat-frontend-dev/infra
```

After deployment, review the console output and copy the SiteUrl value from FrontendInfraStack — this is your CloudFront domain (e.g., https://dxxxx.cloudfront.net).

**Example output:**
```bash
Outputs:
receiptcatfrontenddevinfra********.DistributionId = **************
receiptcatfrontenddevinfra********.SiteBucketName = receiptcat-frontend-dev--receiptcatfrontenddevre-************
receiptcatfrontenddevinfra********.SiteUrl = https://dxxxx.cloudfront.net <-- Take note of this
Stack ARN:
arn:aws:cloudformation:ap-southeast-2:************:stack/receiptcat-frontend-dev-infra/...
```
Tip: If the deployment completes successfully, you can rerun the same command
(`cdk deploy receiptcat-frontend-dev/infra`) to display the outputs again — CDK will skip redeploying unchanged resources.

### 2) Update the frontend URL for dev
Update your shell env (or .env file) to use the real CloudFront domain:

```bash
FRONTEND_URL_DEV="<SiteUrl-from-step-1>"
```

(Re-run your terminal session's `env` if you use a different shell or CI.)

### 3) Configure Cognito hosted UI (one-time per environment)
In the Amazon Cognito console, open your **User Pool → App client → Hosted UI (Managed login pages)** and add:

- **Allowed callback URLs**
  - `${FRONTEND_URL_DEV}/app`
  - `${FRONTEND_URL_DEV}/app.html`
- **Allowed sign-out URLs**
  - `${FRONTEND_URL_DEV}`

Save changes.

### 4) Re-deploy infra to propagate URLs/CORS
Re-deploy the infra stacks that reference the frontend URL (CORS allow‑origins, public env SSM params, etc.):

```bash
cdk deploy receiptcat-backend-dev/infra receiptcat-frontend-dev/infra
```

This ensures:
- S3 bucket CORS allow‑origins include the CloudFront domain
- API Gateway/Cognito‑related public envs (e.g., `NEXT_PUBLIC_OIDC_REDIRECT_URI`, `NEXT_PUBLIC_POST_LOGOUT_URL`, `CYPRESS_FRONTEND_BASE_URL`) are updated in SSM

### 5) Deploy frontend pipeline and wrapper
Finally, deploy the frontend pipeline and the dev stage stack:

```bash
cdk deploy receiptcat-frontend-dev/pipeline receiptcat-frontend-dev
```

The pipeline will:
- Build and test the frontend
- Read public env from SSM
- Sync assets to S3 and refresh CloudFront cache so users will see the newly-deployed version

### Subsequent updates
- If the CloudFront domain changes, repeat steps **2 → 5**.
- For code-only backend changes, commit to the appropriate branch; the backend pipeline will update Lambda code via `lambda:UpdateFunctionCode`.
- For infra changes affecting CORS/redirects, run step **4** to re-seed SSM and re-apply policies.


## End-to-end Production workflow (summary)

The **steps are identical to the dev workflow** above; only stage‑specific values change.

**What changes vs dev**
- Use environment variable `FRONTEND_URL_PROD` (instead of `FRONTEND_URL_DEV`).
- Use `*-prod/*` stack names (instead of `*-dev/*`).
- Configure Cognito User Pool
- Ensure Cognito Hosted UI includes **prod** domain(s) in allowed **callback** and **sign‑out** URLs.

**0) Stage variables**
```bash
CDK_DEFAULT_ACCOUNT=<ACCOUNT_ID>
CDK_DEFAULT_REGION=ap-southeast-2
# Optional: override the default; otherwise the app will use a placeholder until the first FrontendInfraStack deploy outputs the real value
FRONTEND_URL_PROD="https://placeholder-cloudfront-domain"
```

**1) Initial infra deploys (prod)**
```bash
cdk deploy \
  receiptcat-common \
  receiptcat-backend-prod/infra \
  receiptcat-backend-prod/pipeline \
  receiptcat-backend-prod \
  receiptcat-frontend-prod/infra
```
Copy the **`SiteUrl`** output from `FrontendInfraStack` (e.g., `https://dxxxx.cloudfront.net`).

**2) Set the prod frontend URL**
```bash
FRONTEND_URL_PROD="<SiteUrl-from-step-1>"
```

**3) Configure Cognito Hosted UI (prod)**
Add/update in **User Pool → App client → Hosted UI**:
- **Allowed callback URLs**
  - `${FRONTEND_URL_PROD}/app`
  - `${FRONTEND_URL_PROD}/app.html`
- **Allowed sign-out URLs**
  - `${FRONTEND_URL_PROD}`

**4) Re-deploy infra to propagate URLs/CORS (prod)**
```bash
cdk deploy receiptcat-backend-prod/infra receiptcat-frontend-prod/infra
```

**5) Deploy frontend pipeline and wrapper (prod)**
```bash
cdk deploy receiptcat-frontend-prod/pipeline receiptcat-frontend-prod
```

**Notes**
- If you later support configured domains, update `FRONTEND_URL_PROD`, adjust Cognito Hosted UI URLs, then repeat steps **4 → 5** to propagate the change.


## Project layout

```
receiptcat-infra/
├─ assets/                               # Static files used by stacks (e.g., Lambda zips, diagrams)
├─ bin/
│  └─ receiptcat-infra.ts                # CDK app entrypoint: instantiates stacks per stage (dev/prod/feature)
├─ cdk.out/                              # CDK synthesis output (generated)
├─ helpers/
│  └─ names.ts                           # Centralised naming helpers (prefixes, stack ids, logical names)
├─ lib/
│  ├─ backend/
│  │  └─ stacks/
│  │     ├─ backend-infra-stack.ts       # Core backend infra (API GW, Lambdas, DynamoDB, S3, SNS, roles, perms)
│  │     ├─ backend-pipeline-stack.ts    # Backend CI/CD (CodeCommit/CodeBuild/CodePipeline, coverage reports, deploy)
│  │     └─ backend-stack.ts             # Convenience "wrapper" stack for env wiring/outputs
│  ├─ common/
│  │  └─ common-infra-stack.ts           # Shared resources (e.g., Cognito User Pool, shared SSM params/keys)
│  └─ frontend/
│     ├─ cloudfront-functions/           # CloudFront Function(s) for rewrites/headers (no Edge runtime)
│     └─ stacks/
│        ├─ frontend-infra-stack.ts      # Frontend hosting (S3 bucket, CloudFront dist, OAC/OAI, SSM outputs)
│        ├─ frontend-pipeline-stack.ts   # Frontend CI/CD (asset builds, S3 deploy, CF invalidation)
│        └─ frontend-stack.ts            # Convenience "wrapper" stack for env wiring/outputs
├─ node_modules/                         # Dependencies (generated)
├─ .gitignore
├─ cdk.context.json                      # CDK context (e.g., stage=dev/prod/feature, region, toggles)
├─ cdk.json                              # CDK app config (entrypoint, context defaults)
├─ package-lock.json
├─ package.json
├─ README.md
└─ tsconfig.json
```


## Environment & naming conventions
- Environments: `dev`, `feature`, `prod`.
- Resource name prefixes are consistent across stacks (e.g. `receiptcat-backend-dev-*`).


## Bootstrapping your AWS account
AWS CDK requires a one‑time bootstrap per account/region to provision the toolkit stack.

```bash
# Choose your AWS profile & region
export CDK_DEFAULT_ACCOUNT=your-profile
export CDK_DEFAULT_REGION=ap-southeast-2

# One-time per account/region
cdk bootstrap aws://<ACCOUNT_ID>/ap-southeast-2
```


## Local setup
```bash
# Install dependencies
npm ci

# (Optional) verify CDK version
cdk --version
```


## Synth, Diff, Deploy, Destroy
### Synthesise CloudFormation (all stacks)
```bash
cdk synth
```

### See what will change
```bash
cdk diff
```

### Deploy a specific stack
```bash
cdk deploy receiptcat-common

cdk deploy receiptcat-backend-dev/infra
cdk deploy receiptcat-backend-dev/pipeline
cdk deploy receiptcat-backend-dev
cdk deploy receiptcat-frontend-dev/infra
cdk deploy receiptcat-frontend-dev/pipeline
cdk deploy receiptcat-frontend-dev

cdk deploy receiptcat-backend-prod/infra
cdk deploy receiptcat-backend-prod/pipeline
cdk deploy receiptcat-backend-prod
cdk deploy receiptcat-frontend-prod/infra
cdk deploy receiptcat-frontend-prod/pipeline
cdk deploy receiptcat-frontend-prod
```

### Destroy
```bash
cdk destroy receiptcat-frontend-dev
cdk destroy receiptcat-frontend-dev/pipeline
cdk destroy receiptcat-frontend-dev/infra
cdk destroy receiptcat-backend-dev
cdk destroy receiptcat-backend-dev/pipeline
cdk destroy receiptcat-backend-dev/infra

cdk destroy receiptcat-frontend-prod
cdk destroy receiptcat-frontend-prod/pipeline
cdk destroy receiptcat-frontend-prod/infra
cdk destroy receiptcat-backend-prod
cdk destroy receiptcat-backend-prod/pipeline
cdk destroy receiptcat-backend-prod/infra

cdk destroy receiptcat-common
```

> **Warning:** Destroy will remove data (e.g. DynamoDB, S3) for any non-production stacks. Back up any necessary data before destroying.
> **Warning:** Destroy will not auto-delete certain lambda CloudWatch logs. You can delete them manually through the AWS consoles.


## Stacks & resources

### Common (shared) stack
> **Purpose:** Provide shared/auth resources consumed by both frontend and backend.

**Key resources**
- **Amazon Cognito User Pool** – exposed in the code as `common.userPool`. Used by API Gateway authorizer protecting backend endpoints.
- **S3 Artifacts Bucket** – shared CodePipeline artifact storage.
- **S3 Reports Bucket** – destination for backend test reports uploaded by CodeBuild.

---

### BackendInfraStack
> **Purpose:** Core serverless backend for receipt extraction, categorisation, and APIs.

**Amazon DynamoDB – `ReceiptsTable`**
- **PK:** `user_id` (String)
- **SK:** `receipt_id` (String)
- **GSI:**
  - `user_date-index` — PK: `user_id`, SK: `date` (String), projection **ALL**

**Amazon S3 – `ReceiptsBucket`**
- Private bucket for uploads & processed assets;
- **CORS** allow-origins: The deployed `frontendUrl`, and any local endpoints for local development: `http://localhost:3000`, `http://192.168.1.32:3000`,
- **S3 event** trigger: OBJECT_CREATED with prefix `tmp/users/` → `receiptExtractorFn`

**Amazon SNS – `ReceiptTopic`**
- Pub/Sub topic for processing notifications created by the receipt extractor Lambda function, and to be received by the receipt categorizer Lambda function.
- `receiptExtractorFn` **publishes** events; `receiptCategorizerFn` is **subscribed** to the topic

**AWS Lambda functions**
- `receiptExtractorFn` – Triggered by S3 (prefix `tmp/users/`); uses **Textract AnalyzeExpense** to parse receipt data; writes to DynamoDB; **publishes** to SNS  
  • Permissions: `textract:AnalyzeExpense`, S3 read/write, DynamoDB read/write, SNS publish
- `receiptCategorizerFn` – Triggered by **SNS**; calls **Bedrock InvokeModel** (Claude 3.7) to classify items; updates DynamoDB  
  • Permissions: `bedrock:InvokeModel`, DynamoDB read/write
- `presignUploadFn` – Generates **pre‑signed S3 PUT** URLs for client uploads  
  • Permissions: `s3:PutObject`
- `dashboardFn` – Serves aggregated dashboard data from DynamoDB (GET `/users/{userId}/dashboard`)  
  • Permissions: DynamoDB read
- `receiptHistoryFn` – Lists a user's receipts (GET `/users/{userId}/receipts`)  
  • Permissions: DynamoDB read
- `receiptDetailsFn` – Returns a single receipt, with optional S3 access for assets (GET `/users/{userId}/receipts/{receiptId}`)  
  • Permissions: DynamoDB read, S3 read
- `updateReceiptFn` – Updates receipt metadata/items (PUT `/users/{userId}/receipts/{receiptId}`)  
  • Permissions: DynamoDB read/write, S3 read/write

**Amazon API Gateway – `ReceiptCAT-API`**
- REST API with **Cognito authorizer** (from Common stack)
- **Routes**
  - `POST /upload/presign` → `presignUploadFn`
  - `GET  /users/{userId}/dashboard` → `dashboardFn`
  - `GET  /users/{userId}/receipts` → `receiptHistoryFn`
  - `GET  /users/{userId}/receipts/{receiptId}` → `receiptDetailsFn`
  - `PUT  /users/{userId}/receipts/{receiptId}` → `updateReceiptFn`

---

### BackendPipelineStack
> **Purpose:** CI/CD for backend Lambdas and infrastructure.

**Pipeline source**
- **CodeCommit repo:** `receiptcat-backend`
- **Branch:** `develop` (dev), `main` (prod), `feature-{*}` (feature)

**Stages**
1. **Source** – CodeCommit checkout
2. **Build** – `buildspec-build.yml`
3. **UnitTest** – `buildspec-test.yml`; enforces coverage threshold (**85%** for feature/dev, **80%** for prod); uploads reports to **Reports Bucket** under `${app}-backend/test-reports/${stage}`
4. **Deploy** – `buildspec-deploy.yml`; updates Lambda code via `lambda:UpdateFunctionCode`

**Buckets & permissions**
- Uses shared **Artifacts Bucket** (from Common stack) for pipeline artifacts
- Writes test reports to shared **Reports Bucket**, with IAM restricted to the stage prefix

---

### Backend Dev/Prod/Feature Stage stacks & Pipeline stacks
> Wrapper stacks that instantiate `BackendInfraStack` per environment, plus corresponding pipelines.

- **`BackendDevStageStack`** – dev environment infra + pipeline
- **`BackendProdStageStack`** – prod environment infra + pipeline
- **`BackendFeatureStageStack`** – feature environment infra + pipeline (branch `feature-{*}`; replace this with your desired feature branch)

> Each stage stack wires environment‑specific names and tags, and can emit separate outputs.

---

### FrontendInfraStack
> **Purpose:** Host the web UI via S3 + CloudFront with optional public config parameters.

**Resources**
- **S3 Bucket** (website assets via Solutions Construct)
  - Provisioned using `@aws-solutions-constructs/aws-cloudfront-s3`
  - Versioned; **dev/feature**: `RemovalPolicy.DESTROY` + `autoDeleteObjects`; **prod**: `RemovalPolicy.RETAIN`
  - Separate **access logs** bucket created by the construct
- **CloudFront Distribution** (origin = S3 bucket)
  - `defaultRootObject: index.html`
  - SPA deep-link fallback via **error responses**: 403/404 → `/index.html`
  - **Viewer request** association with CloudFront **Function** `rewrite-html` for HTML rewrites
  - **HTTPS redirects** enforced (`ViewerProtocolPolicy.REDIRECT_TO_HTTPS`)
- **SSM Parameters** (prefix: `/${app}/${stage}/${domain}`)
  - `/site-bucket`, `/distribution-id`, `/cloudfront-domain-name`
  - public env seeding under `/${app}/${stage}/${domain}/env/*` for keys:
    `NEXT_PUBLIC_OIDC_AUTHORITY`, `NEXT_PUBLIC_COGNITO_DOMAIN`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_OIDC_REDIRECT_URI`, `NEXT_PUBLIC_POST_LOGOUT_URL`, `NEXT_PUBLIC_API_BASE`, `USER_POOL_ID`, `CYPRESS_TEST_USERNAME`, `CYPRESS_TEST_PASSWORD`, `CYPRESS_FRONTEND_BASE_URL`

**Outputs**
- **Site URL** (CloudFront domain) (`SiteUrl`)
- **Distribution ID** (`DistributionId`)
- **Bucket name** (`SiteBucketName`)

---

### FrontendPipelineStack
> **Purpose:** CI/CD for the frontend (build, test, deploy, invalidate).

**Pipeline source**
- **CodeCommit repo:** `receiptcat-frontend`
- **Branch:** `develop` (dev), `main` (prod), `feature-{*}` (feature)

**Stages**
1. **Source** – CodeCommit checkout
2. **Build** – `buildspec-build.yml` (reads public env from SSM path `/${app}/${stage}/${domain}/env/*`)
3. **UnitTest** – `buildspec-unittest.yml`; uploads reports to **Reports Bucket** under `${app}-frontend/test-reports/${stage}`
4. **IntegrationTest** – `buildspec-integrationtest.yml`; uploads reports to same prefix
5. **Deploy** – `buildspec-deploy.yml`; reads SSM parameters `/site-bucket`, `/distribution-id`, `/cloudfront-domain-name`; syncs to S3 and **invalidates CloudFront** (`/index.html /404.html /service-worker.js /_next/static/*`)

**Buckets & permissions**
- Uses shared **Artifacts Bucket** (from Common stack) for pipeline artifacts
- Writes test reports to shared **Reports Bucket**, with IAM restricted to the stage prefix

---

### Frontend Dev/Prod/Feature Stage stacks & Pipeline
> Wrapper stacks that instantiate `FrontendInfraStack` per environment, plus the corresponding pipeline.

- **`FrontendDevStageStack`** – dev environment infra + pipeline (branch `develop`)
- **`FrontendProdStageStack`** – prod environment infra + pipeline (branch `main`)
- **`FrontendFeatureStageStack`** – feature environment infra + pipeline (branch `feature-{*}`; replace this with your desired feature branch)

> Each stage wires environment‑specific names/tags, seeds optional public env to SSM, and emits standard outputs (SiteUrl, DistributionId, SiteBucketName).
