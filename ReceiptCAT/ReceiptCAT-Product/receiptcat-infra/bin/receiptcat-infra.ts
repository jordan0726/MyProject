#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendFeatureStageStack, BackendDevStageStack, BackendProdStageStack } from '../lib/backend/backend-stack';
import { CommonInfraStack } from '../lib/common/common-infra-stack';
import { FrontendDevStageStack, FrontendFeatureStageStack, FrontendProdStageStack } from '../lib/frontend/frontend-stack';

const APP_NAME = 'receiptcat';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? '080205649503',
  region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-2',
  frontendUrlDev: process.env.FRONTEND_URL_DEV ?? 'https://dewsori2weo7.cloudfront.net',
  frontendUrlProd: process.env.FRONTEND_URL_PROD ?? 'https://dewsori2weo7.cloudfront.net',
  frontendUrlFeature: process.env.FRONTEND_URL_FEATURE ?? 'https://dewsori2weo7.cloudfront.net'
};

const common = new CommonInfraStack(app, 'receiptcat-common', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT common resource stack',
  userPoolId: 'ap-southeast-2_VpSug7NVk'
});

const backendDev = new BackendDevStageStack(app, 'receiptcat-backend-dev', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT backend dev main stack (infra + pipeline)',
  frontendUrl: env.frontendUrlDev,
  common,
});
backendDev.addDependency(common);
const backendDevApiUrl = cdk.Fn.importValue('receiptcat-backend-dev-api');

const frontendDev = new FrontendDevStageStack(app, 'receiptcat-frontend-dev', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT frontend dev main stack (infra + pipeline)',
  publicEnv: {
    NEXT_PUBLIC_OIDC_AUTHORITY: 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_VpSug7NVk',
    NEXT_PUBLIC_COGNITO_DOMAIN: 'https://ap-southeast-2vpsug7nvk.auth.ap-southeast-2.amazoncognito.com',
    NEXT_PUBLIC_COGNITO_CLIENT_ID: '542rdb81kgsrosijt332ojr020',
    NEXT_PUBLIC_OIDC_REDIRECT_URI: `${env.frontendUrlDev}/app`,
    NEXT_PUBLIC_POST_LOGOUT_URL: env.frontendUrlDev,
    NEXT_PUBLIC_API_BASE: backendDevApiUrl,
    USER_POOL_ID: 'ap-southeast-2_VpSug7NVk',
    CYPRESS_TEST_USERNAME: 'receiptcate2etest@gmail.com',
    CYPRESS_TEST_PASSWORD: 'Receiptcate2etest!',
    CYPRESS_FRONTEND_BASE_URL: env.frontendUrlDev
  },
  artifactsBucket: common.artifactsBucket,
  reportsBucket: common.reportsBucket
});
frontendDev.addDependency(backendDev);


const backendProd = new BackendProdStageStack(app, 'receiptcat-backend-prod', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT backend prod main stack (infra + pipeline)',
  frontendUrl: env.frontendUrlProd,
  common,
});
backendProd.addDependency(common);
const backendProdApiUrl = cdk.Fn.importValue('receiptcat-backend-prod-api');

const frontendProd = new FrontendProdStageStack(app, 'receiptcat-frontend-prod', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT frontend prod main stack (infra + pipeline)',
  publicEnv: {
    NEXT_PUBLIC_OIDC_AUTHORITY: 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_VpSug7NVk',
    NEXT_PUBLIC_COGNITO_DOMAIN: 'https://ap-southeast-2vpsug7nvk.auth.ap-southeast-2.amazoncognito.com',
    NEXT_PUBLIC_COGNITO_CLIENT_ID: '542rdb81kgsrosijt332ojr020',
    NEXT_PUBLIC_OIDC_REDIRECT_URI: `${env.frontendUrlProd}/app`,
    NEXT_PUBLIC_POST_LOGOUT_URL: env.frontendUrlProd,
    NEXT_PUBLIC_API_BASE: backendProdApiUrl,
    USER_POOL_ID: 'ap-southeast-2_VpSug7NVk',
    CYPRESS_TEST_USERNAME: 'receiptcate2etest@gmail.com',
    CYPRESS_TEST_PASSWORD: 'Receiptcate2etest!',
    CYPRESS_FRONTEND_BASE_URL: env.frontendUrlProd
  },
  artifactsBucket: common.artifactsBucket,
  reportsBucket: common.reportsBucket
});
frontendProd.addDependency(backendProd);

const backendFeature = new BackendFeatureStageStack(app, 'receiptcat-backend-feature', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT backend feature main stack (infra + pipeline)',
  frontendUrl: env.frontendUrlFeature,
  common,
});
backendFeature.addDependency(common);
const backendFeatureApiUrl = cdk.Fn.importValue('receiptcat-backend-feature-api');

const frontendFeature = new FrontendFeatureStageStack(app, 'receiptcat-frontend-feature', {
  env,
  app: APP_NAME,
  description: 'ReceiptCAT frontend feature main stack (infra + pipeline)',
  publicEnv: {
    NEXT_PUBLIC_OIDC_AUTHORITY: 'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_VpSug7NVk',
    NEXT_PUBLIC_COGNITO_DOMAIN: 'https://ap-southeast-2vpsug7nvk.auth.ap-southeast-2.amazoncognito.com',
    NEXT_PUBLIC_COGNITO_CLIENT_ID: '542rdb81kgsrosijt332ojr020',
    NEXT_PUBLIC_OIDC_REDIRECT_URI: `${env.frontendUrlFeature}/app`,
    NEXT_PUBLIC_POST_LOGOUT_URL: env.frontendUrlFeature,
    NEXT_PUBLIC_API_BASE: backendFeatureApiUrl,
    USER_POOL_ID: 'ap-southeast-2_VpSug7NVk',
    CYPRESS_TEST_USERNAME: 'receiptcate2etest@gmail.com',
    CYPRESS_TEST_PASSWORD: 'Receiptcate2etest!',
    CYPRESS_FRONTEND_BASE_URL: env.frontendUrlFeature
  },
  artifactsBucket: common.artifactsBucket,
  reportsBucket: common.reportsBucket
});
frontendFeature.addDependency(backendFeature);
