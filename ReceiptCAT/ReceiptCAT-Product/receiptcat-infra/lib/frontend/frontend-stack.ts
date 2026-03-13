import * as cdk from 'aws-cdk-lib';
import { FrontendInfraProps, FrontendInfraStack } from './stacks/frontend-infra-stack';
import { FrontendPipelineProps, FrontendPipelineStack } from './stacks/frontend-pipeline-stack';
import * as s3 from "aws-cdk-lib/aws-s3";

export const FRONTEND_DOMAIN = 'frontend';

export interface FrontendStackProps extends cdk.StackProps {
  app: string;
  publicEnv: Record<string, string>;
  artifactsBucket: s3.IBucket;
  reportsBucket: s3.IBucket;
}

export class FrontendDevStageStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FrontendStackProps) {
    super(scope, id, props);
    const stage = 'dev';

    const frontendInfra = new FrontendInfraStack(this, 'infra', {
      env: props.env,
      description: 'ReceiptCAT frontend dev infrastructure (S3, CloudFront)',
      app: props.app,
      stackName: `${props.app}-${FRONTEND_DOMAIN}-${stage}-infra`,
      domain: FRONTEND_DOMAIN,
      stage: stage,
      tags: { Project: props.app, Env: stage },
      manageResources: true,
      publicEnv: props.publicEnv,
    } as FrontendInfraProps);

    const frontendPipeline = new FrontendPipelineStack(this, 'pipeline', {
      env: props.env,
      description: 'ReceiptCAT frontend dev pipeline',
      sourceRepoName: 'receiptcat-frontend',
      sourceBranch: 'develop',
      app: props.app,
      stackName: `${props.app}-${FRONTEND_DOMAIN}-${stage}-pipeline`,
      domain: FRONTEND_DOMAIN,
      stage: stage,
      tags: { Project: props.app, Env: stage },
      coverageMinPercent: 85,
      artifactsBucket: props.artifactsBucket,
      reportsBucket: props.reportsBucket
    } as FrontendPipelineProps);

    frontendPipeline.addDependency(frontendInfra);
  }
}

export class FrontendProdStageStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FrontendStackProps) {
    super(scope, id, props);
    const stage = 'prod';

    const frontendInfra = new FrontendInfraStack(this, 'infra', {
      env: props.env,
      description: 'ReceiptCAT frontend prod infrastructure (S3, CloudFront)',
      app: props.app,
      stackName: `${props.app}-${FRONTEND_DOMAIN}-${stage}-infra`,
      domain: FRONTEND_DOMAIN,
      stage: stage,
      tags: { Project: props.app, Env: stage },
      manageResources: true,
      publicEnv: props.publicEnv,
    } as FrontendInfraProps);

    const frontendPipeline = new FrontendPipelineStack(this, 'pipeline', {
      env: props.env,
      description: 'ReceiptCAT frontend prod pipeline',
      sourceRepoName: 'receiptcat-frontend',
      sourceBranch: 'main',
      app: props.app,
      stackName: `${props.app}-${FRONTEND_DOMAIN}-${stage}-pipeline`,
      domain: FRONTEND_DOMAIN,
      stage: stage,
      tags: { Project: props.app, Env: stage },
      coverageMinPercent: 80,
      artifactsBucket: props.artifactsBucket,
      reportsBucket: props.reportsBucket
    } as FrontendPipelineProps);

    frontendPipeline.addDependency(frontendInfra);
  }
}

export class FrontendFeatureStageStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FrontendStackProps) {
    super(scope, id, props);
    const stage = 'feature';

    const frontendInfra = new FrontendInfraStack(this, 'infra', {
      env: props.env,
      description: 'ReceiptCAT frontend feature infrastructure (S3, CloudFront)',
      app: props.app,
      stackName: `${props.app}-${FRONTEND_DOMAIN}-${stage}-infra`,
      domain: FRONTEND_DOMAIN,
      stage: stage,
      tags: { Project: props.app, Env: stage },
      manageResources: true,
      publicEnv: props.publicEnv,
    } as FrontendInfraProps);

    const frontendPipeline = new FrontendPipelineStack(this, 'pipeline', {
      env: props.env,
      description: 'ReceiptCAT frontend feature pipeline',
      sourceRepoName: 'receiptcat-frontend',
      sourceBranch: 'feature-timeedit', // Note: Can change to any desired feature-* branch
      app: props.app,
      stackName: `${props.app}-${FRONTEND_DOMAIN}-${stage}-pipeline`,
      domain: FRONTEND_DOMAIN,
      stage: stage,
      tags: { Project: props.app, Env: stage },
      coverageMinPercent: 85,
      artifactsBucket: props.artifactsBucket,
      reportsBucket: props.reportsBucket
    } as FrontendPipelineProps);

    frontendPipeline.addDependency(frontendInfra);
  }
}