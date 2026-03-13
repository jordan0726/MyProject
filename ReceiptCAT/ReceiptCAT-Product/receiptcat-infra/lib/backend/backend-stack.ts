import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendInfraProps, BackendInfraStack } from './stacks/backend-infra-stack';
import { BackendPipelineProps, BackendPipelineStack } from './stacks/backend-pipeline-stack';
import { CommonInfraStack } from '../common/common-infra-stack';

const BACKEND_DOMAIN = 'backend';

export interface BackendStackProps extends cdk.StackProps {
  app: string;
  frontendUrl: string;
}

export class BackendDevStageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps & { common: CommonInfraStack }) {
    super(scope, id, props);
    const { app, frontendUrl } = props;
    const stage = 'dev';

    const backendInfra = new BackendInfraStack(this, 'infra', {
      ...props,
      app: app,
      stackName: `${app}-${BACKEND_DOMAIN}-${stage}-infra`,
      domain: BACKEND_DOMAIN,
      stage: stage,
      description: 'ReceiptCAT backend dev infra',
      manageResources: true,
      userPool: props.common.userPool,
      frontendUrl: frontendUrl,
      tags: { Project: app, Env: stage }
    } as BackendInfraProps);

    const backendPipeline = new BackendPipelineStack(this, 'pipeline', {
      ...props,
      app: app,
      stackName: `${app}-${BACKEND_DOMAIN}-${stage}-pipeline`,
      domain: BACKEND_DOMAIN,
      stage: stage,
      description: 'ReceiptCAT backend dev pipeline',
      sourceRepoName: 'receiptcat-backend',
      sourceBranch: 'develop',
      coverageMinPercent: 85,
      artifactsBucket: props.common.artifactsBucket,
      reportsBucket: props.common.reportsBucket,
      tags: { Project: app, Env: stage }
    } as BackendPipelineProps);

    backendPipeline.addDependency(backendInfra);
  }
}

export class BackendProdStageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps & { common: CommonInfraStack }) {
    super(scope, id, props);
    const { app, frontendUrl } = props;
    const stage = 'prod';

    const backendInfra = new BackendInfraStack(this, 'infra', {
      ...props,
      app: app,
      stackName: `${app}-${BACKEND_DOMAIN}-${stage}-infra`,
      domain: BACKEND_DOMAIN,
      stage: stage,
      description: 'ReceiptCAT backend prod infra',
      manageResources: true,
      userPool: props.common.userPool,
      frontendUrl: frontendUrl,
      tags: { Project: app, Env: stage }
    } as BackendInfraProps);

    const backendPipeline = new BackendPipelineStack(this, 'pipeline', {
      ...props,
      app: app,
      stackName: `${app}-${BACKEND_DOMAIN}-${stage}-pipeline`,
      domain: BACKEND_DOMAIN,
      stage: stage,
      description: 'ReceiptCAT backend prod pipeline',
      sourceRepoName: 'receiptcat-backend',
      sourceBranch: 'main',
      coverageMinPercent: 80,
      artifactsBucket: props.common.artifactsBucket,
      reportsBucket: props.common.reportsBucket,
      tags: { Project: app, Env: stage }
    } as BackendPipelineProps);

    backendPipeline.addDependency(backendInfra);
  }
}

export class BackendFeatureStageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps & { common: CommonInfraStack }) {
    super(scope, id, props);
    const { app, frontendUrl } = props;
    const stage = 'feature';

    const backendInfra = new BackendInfraStack(this, 'infra', {
      ...props,
      app: app,
      stackName: `${app}-${BACKEND_DOMAIN}-${stage}-infra`,
      domain: BACKEND_DOMAIN,
      stage: stage,
      description: 'ReceiptCAT backend feature infra',
      manageResources: true,
      userPool: props.common.userPool,
      frontendUrl: frontendUrl,
      tags: { Project: app, Env: stage }
    } as BackendInfraProps);

    const backendPipeline = new BackendPipelineStack(this, 'pipeline', {
      ...props,
      app: app,
      stackName: `${app}-${BACKEND_DOMAIN}-${stage}-pipeline`,
      domain: BACKEND_DOMAIN,
      stage: stage,
      description: 'ReceiptCAT backend feature pipeline',
      sourceRepoName: 'receiptcat-backend',
      sourceBranch: 'feature-timeedit', // Note: Can change to any desired feature-* branch
      coverageMinPercent: 85,
      artifactsBucket: props.common.artifactsBucket,
      reportsBucket: props.common.reportsBucket,
      tags: { Project: app, Env: stage }
    } as BackendPipelineProps);

    backendPipeline.addDependency(backendInfra);
  }
}