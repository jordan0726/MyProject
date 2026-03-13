import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface CommonInfraProps extends cdk.StackProps {
  app: string;
  userPoolId: string;
}

export class CommonInfraStack extends cdk.Stack {
  public readonly artifactsBucket: s3.Bucket;
  public readonly reportsBucket: s3.Bucket;
  public readonly userPool: cognito.IUserPool;

  constructor(scope: Construct, id: string, props: CommonInfraProps) {
    super(scope, id, props);
    const { app, userPoolId } = props;

    // Artifacts bucket for CodePipeline/CodeBuild artifacts
    this.artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      bucketName: `${app}-artifacts`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // Test reports bucket (JUnit, LCOV, HTML coverage)
    this.reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      bucketName: `${app}-test-results`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    new cdk.CfnOutput(this, 'ArtifactsBucketName', { value: this.artifactsBucket.bucketName });
    new cdk.CfnOutput(this, 'ReportsBucketName', { value: this.reportsBucket.bucketName });

    this.userPool = cognito.UserPool.fromUserPoolId(this, 'ReceiptCAT-UserPool', userPoolId);

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });

  }
}
