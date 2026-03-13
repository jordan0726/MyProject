# ReceiptCat Frontend

React/Next.js UI for the ReceiptCat product suite. This README focuses on the frontend application that lives under `receiptcat-frontend`.

---

## Release Notes

- **2025-10-22 — Develop Snapshot (`a988f9e`)**
  - Dashboard enhancements: added time filter, receipts count widget, and support for the new receipt history endpoint.
  - Data alignment: mapped legacy categories to new backend categories and wired up the updated API endpoint.
  - UX refinements and fixes: adjusted toast messaging and resolved add/edit receipt issues blocking saves.
  - Test hardening: refreshed Cypress smoke pack, added additional e2e coverage, and tuned package.json/env configs for CI.

---

## Project Links

- **Repository:** AWS CodeCommit (private): https://ap-southeast-2.console.aws.amazon.com/codesuite/codecommit/repositories/receiptcat-frontend/browse?region=ap-southeast-2 _(requires client AWS credentials)_
- **Cloud Deployment:** https://dewsori2weo7.cloudfront.net

---

## Project Structure

- Root (`buildspec-*.yml`, `cypress/`, `reports/`, etc.): CI/CD definitions, end-to-end specs, and generated artifacts.
- `src/`: application source code organized by feature and shared concerns.
  - `pages/`: Next.js pages routing and API route handlers.
  - `features/`: domain-focused bundles combining UI, hooks, and state for key workflows.
  - `components/`: reusable presentation elements shared across the app.
  - `layouts/`: top-level layout wrappers applied to multiple pages.
  - `lib/`: service clients, helpers, and cross-cutting utilities.
  - `config/`: configuration objects/constants shaping runtime behavior.
  - `assets/`: static images, icons, and styles consumed by the UI.
  - `types/`: TypeScript definitions shared across modules.
  - `tests/`: Jest-powered component and page test suites.

---

## Installation & Running

### Prerequisites

- Node.js 18+ (align with the version used in the deployment pipeline)
- npm 9+ (or an alternative package manager supported by the team)
- Access to the environment variables listed in [Credentials & Environment](#credentials--environment)

### Local Setup

```bash
cd receiptcat-frontend
npm install
cp .env.development .env.local   # adjust source as appropriate
npm run dev
```

- Open `http://localhost:3000` to access the app.
- Update environment variables in `.env.local` to point at the desired backend services.

### Production Build & Preview

```bash
npm run build
npm run start
```

- Serves the optimized build on `http://localhost:3000` by default.
- To host the static export used for e2e testing:

```bash
npm run build
npx next export   # align with the pipeline step if static export is required
npm run serve:static
```

---

## Credentials & Environment

- Environment variables live in `.env.development` for reference; do **not** commit credentials to source control.
- Required keys when running locally:
  - `NEXT_PUBLIC_OIDC_AUTHORITY`
  - `NEXT_PUBLIC_COGNITO_DOMAIN`
  - `NEXT_PUBLIC_COGNITO_CLIENT_ID`
  - `NEXT_PUBLIC_OIDC_REDIRECT_URI`
  - `NEXT_PUBLIC_POST_LOGOUT_URL`
  - `NEXT_PUBLIC_API_BASE`
  - _Placeholder: add secrets or additional keys required for deployments (e.g., AWS credentials, Cognito user pool details)._
- Testing accounts:
  - `CYPRESS_TEST_USERNAME`
  - `CYPRESS_TEST_PASSWORD`
  - Test credentials are stored in AWS SSM and used by CodeBuild for Cypress integration testing.

---

## Development Workflow

- Linting: `npm run lint`
- Unit tests: `npm run test:unit`
- CI test suite: `npm run test:ci`
- Cypress e2e (local against static build): `npm run test:e2e:local`
- Cypress e2e (against cloud env): `npm run test:e2e`

### Further Documentation
For additional technical context and development references:
- **Development Guide** — covers project setup, environment configuration, and step-by-step deployment workflow.  
  _Location:_ `/Assignment2/Project Report.pdf/`  Chapter: Development Guide 7.5 Deployment

- **Technical Solution Design** — details the system architecture, AWS services (Textract, Bedrock, Cognito, S3, Lambda, DynamoDB), and integration model.  
  _Location:_ `/Assignment2/Project Report.pdf/`  Chapter: Technical Solution Design

- **Project Charter** — provides high-level project objectives, scope, deliverables, and sprint artefacts.  
  _Location:_ `/Assignment2/Project Report.pdf/`  Chapter: Project Charter

### Pre-Merge Pipeline Simulation

Before merging to the integration branch, run the same commands that execute in the CI/CD pipeline:

```bash
npm ci
npm run build
npm run test:ci:fresh
npm run test:e2e
```

- `npm ci`: installs dependencies from `package-lock.json` with a clean node_modules to match the build agent environment.
- `npm run build`: runs the Next.js production build to verify the app compiles without errors.
- `npm run test:ci:fresh`: clears Jest caches and executes the CI-configured unit/integration test suite with coverage and JUnit reports.
- `npm run test:e2e`: triggers the Cypress end-to-end suite against the deployed cloud environment to confirm user flows still pass.


## Deployment Notes

- Buildspec files (`buildspec-*.yml`) define the AWS CodeBuild pipelines for build, unit tests, integration tests, and deployment.
- Deployment currently targets an AWS CloudFront distribution (see [Project Links](#project-links)).
- For full details, refer to **Section 7.5: Deployment** in the [Development Guide].

### Step-by-Step Deployment Instructions

#### 1. Automated CI/CD (recommended)

- The project uses **AWS CodePipeline** and **AWS CodeBuild** for automated deployment.
- When a commit is pushed to:
  - `develop` → triggers the **development pipeline**
  - `main` → triggers the **production pipeline**

Each pipeline includes the following stages:

| Stage | Description |
|--------|-------------|
| **Source** | Pulls the latest commit from AWS CodeCommit (`receiptcat-frontend`). |
| **Build** | Runs `npm ci && npm run build` using Node.js 20.x in CodeBuild. |
| **UnitTest** | Executes Jest test suites and uploads coverage reports to the shared Reports S3 bucket. |
| **IntegrationTest** | Runs Cypress e2e tests using environment variables and test accounts from AWS SSM. |
| **Deploy** | Syncs build artifacts to the S3 bucket and invalidates the CloudFront cache to publish the new version. |

#### 2. Manual Deployment (if CI/CD unavailable)

```bash
npm run build
aws s3 sync out/ s3://receiptcat-frontend-dev-site --delete
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```
Retrieve the distribution-id and site-bucket names from AWS Systems Manager(SSM):
`/receiptcat/dev/frontend/distribution-id`  
`/receiptcat/dev/frontend/site-bucket`

### Verification Steps After Deployment

1. Open the CloudFront URL: [https://dewsori2weo7.cloudfront.net](https://dewsori2weo7.cloudfront.net)  
2. Sign in through the Cognito Hosted UI (`receiptcat-dev.auth.ap-southeast-2.amazoncognito.com`).  
3. Upload a sample receipt and confirm:
   - The upload succeeds and appears in **Receipt History**.  
   - API calls to `/upload/presign` and `/users/{userId}/dashboard` return HTTP 200.  
4. Check **AWS CloudWatch Logs** for successful Lambda execution and no CORS or permission errors.  
5. Verify that DynamoDB and S3 contain the uploaded data (items, totals, and receipt image).  
6. Confirm the dashboard charts reflect the new receipt data.

### Production Deployment

To deploy the production version:

```bash
export FRONTEND_URL_PROD="https://<prod-cloudfront-domain>"
cdk deploy receiptcat-frontend-prod/pipeline receiptcat-frontend-prod
```

After deployment:
- Update Cognito Hosted UI callback URLs:
`https://<prod-cloudfront-domain>/app`,
`https://<prod-cloudfront-domain>/app.html`

Re-deploy backend and frontend infra stacks to propagate updated environment variables:
```bash
cdk deploy receiptcat-backend-prod/infra
cdk deploy receiptcat-frontend-prod/infra
```
