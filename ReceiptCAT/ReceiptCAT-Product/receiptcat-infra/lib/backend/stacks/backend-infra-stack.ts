import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as logs from 'aws-cdk-lib/aws-logs'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { Construct } from "constructs";
import { name } from "../../../helpers/names";
import { IUserPool } from "aws-cdk-lib/aws-cognito";

export interface BackendInfraProps extends StackProps {
  stage: string;
  app: string;
  domain: 'backend';
  manageResources?: boolean;
  userPool: IUserPool;
  frontendUrl: string;
}

export class BackendInfraStack extends Stack {
  public readonly receiptExtractorFn: lambda.Function;
  public readonly receiptCategorizerFn: lambda.Function;
  public readonly presignUploadFn: lambda.Function;
  public readonly dashboardFn: lambda.Function;
  public readonly receiptHistoryFn: lambda.Function;
  public readonly receiptDetailsFn: lambda.Function;
  public readonly updateReceiptFn: lambda.Function;


  constructor(scope: Construct, id: string, props: BackendInfraProps) {
    super(scope, id, props);

    const { app, domain, stage, userPool, frontendUrl } = props;
    const manage = props.manageResources ?? (stage === 'dev' || stage === 'feature');

    const isProd = stage === 'prod';
    const receiptsTableName = name(app, domain, stage, 'receipts').toLowerCase();
    const receiptsBucketName = name(app, domain, stage, 'receipts').toLowerCase();
    const snsTopicName = name(app, domain, stage, 'receipt-topic').toLowerCase();

    const getOrCreateBucket = (
      scope: Construct,
      id: string,
      physicalName: string,
      manageFlag: boolean,
      isProduction: boolean
    ): s3.IBucket => {
      if (!manageFlag) {
        return s3.Bucket.fromBucketName(scope, id, physicalName);
      }

      return new s3.Bucket(scope, id, {
        bucketName: physicalName,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        versioned: true,
        removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: !isProduction,
        cors: [
          {
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
            allowedOrigins: ['http://localhost:3000', 'http://192.168.1.32:3000', frontendUrl],
            allowedHeaders: ['*'],
            exposedHeaders: ['ETag'],
            maxAge: 3600,
          },
        ],
        lifecycleRules: [
          // Abort incomplete multipart uploads (must NOT combine with tag filters)
          {
            id: 'abort-incomplete-mpu',
            abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
            enabled: true,
          },
          // Expire all objects tagged stage=tmp after 1 day
          // (Lambda presign adds Tagging=stage=tmp, so this catches users/{sub}/tmp/... only)
          {
            id: 'expire-stage-tmp-24h',
            tagFilters: { stage: 'tmp' },
            expiration: cdk.Duration.days(1),
            enabled: true,
          },
          // Clear old noncurrent versions
          {
            id: 'expire-noncurrent-versions',
            noncurrentVersionExpiration: cdk.Duration.days(30),
            enabled: true,
          },
        ]
      });
    };

    const getOrCreateTable = (
      scope: Construct,
      id: string,
      tableName: string,
      manageFlag: boolean,
      isProduction: boolean
    ): dynamodb.ITable => {
      if (!manageFlag) {
        return dynamodb.Table.fromTableName(scope, id, tableName);
      }

      const table = new dynamodb.Table(scope, id, {
        tableName,
        partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "receipt_id", type: dynamodb.AttributeType.STRING },
        removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        billingMode: dynamodb.BillingMode.PROVISIONED,
        readCapacity: 1,
        writeCapacity: 1,
      });

      table.addGlobalSecondaryIndex({
        indexName: "user_date-index",
        partitionKey: { name: "user_id", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });

      return table;
    };

    // Resource 0: S3 bucket for uploading receipts
    const receiptsBucket = getOrCreateBucket(this, "ReceiptsBucket", receiptsBucketName, manage, isProd);

    // Resource 1: DynamoDB table for receipts
    const receiptsTable = getOrCreateTable(this, "ReceiptsTable", receiptsTableName, manage, isProd);

    if (manage && receiptsTable instanceof dynamodb.Table) {
      // Enable auto-scaling for read capacity
      const readScaling = receiptsTable.autoScaleReadCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      });
      readScaling.scaleOnUtilization({
        targetUtilizationPercent: 70,
      });

      // Enable auto-scaling for write capacity
      const writeScaling = receiptsTable.autoScaleWriteCapacity({
        minCapacity: 1,
        maxCapacity: 10,
      });
      writeScaling.scaleOnUtilization({
        targetUtilizationPercent: 70,
      });
    }

    // Resource 2: SNS topic for receipt notifications
    const receiptTopic = new sns.Topic(this, "ReceiptTopic", {
      topicName: snsTopicName,
    });

    // Resource 3: Receipt Extractor Lambda function (placeholder code; real code shipped by backend pipeline)
    // Create LogGroup for Receipt Extractor Lambda
    const receiptExtractorLogGroup = new logs.LogGroup(this, 'ReceiptExtractorFnLogGroup', {
      logGroupName: `/aws/lambda/${name(app, domain, stage, 'receiptExtractor')}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    this.receiptExtractorFn = new lambda.Function(this, "ReceiptExtractorFn", {
      functionName: name(app, domain, stage, 'receiptExtractor'),
      description: "Extracts receipt data from receipts uploaded to S3 using AWS Textract",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(1),
      memorySize: 1000,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName,
        RECEIPTS_TOPIC_ARN: receiptTopic.topicArn,
        NODE_OPTIONS: "--enable-source-maps"
      },
      logGroup: receiptExtractorLogGroup,
    });

    receiptsTable.grantReadWriteData(this.receiptExtractorFn);
    receiptsBucket.grantReadWrite(this.receiptExtractorFn);
    receiptTopic.grantPublish(this.receiptExtractorFn);

    this.receiptExtractorFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["textract:AnalyzeExpense"],
      resources: ["*"]
    }));

    // Add S3 event notification to trigger Receipt Extractor on object creation (.jpg files) under tmp/
    receiptsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.receiptExtractorFn),
      { prefix: "tmp/users/" }
    );

    // Resource 4: Receipt Categorizer Lambda function (placeholder code; real code shipped by backend pipeline)
    // Create LogGroup for Receipt Categorizer Lambda
    const receiptCategorizerLogGroup = new logs.LogGroup(this, 'ReceiptCategorizerFnLogGroup', {
      logGroupName: `/aws/lambda/${name(app, domain, stage, 'receiptCategorizer')}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    this.receiptCategorizerFn = new lambda.Function(this, "ReceiptCategorizerFn", {
      functionName: name(app, domain, stage, 'receiptCategorizer'),
      description: "Categorizes a set of receipt expense items using AWS Bedrock",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(1),
      memorySize: 1000,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName,
        NODE_OPTIONS: "--enable-source-maps"
      },
      logGroup: receiptCategorizerLogGroup,
    });

    receiptsTable.grantReadWriteData(this.receiptCategorizerFn);

    this.receiptCategorizerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: ["*"]
    }));

    // Subscribe Receipt Categorizer Lambda to SNS topic
    receiptTopic.addSubscription(new subscriptions.LambdaSubscription(this.receiptCategorizerFn));

    // Resource 5: Lambda for generating presigned S3 upload URLs
    // Create LogGroup for Presign Upload Lambda
    const presignUploadLogGroup = new logs.LogGroup(this, 'PresignUploadFnLogGroup', {
      logGroupName: `/aws/lambda/${name(app, domain, stage, 'presign-upload')}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });
    this.presignUploadFn = new lambda.Function(this, 'PresignUploadFn', {
      functionName: name(app, domain, stage, 'presign-upload'),
      description: 'Generates presigned S3 URLs for client uploads',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_BUCKET_NAME: receiptsBucket.bucketName,
        NODE_OPTIONS: "--enable-source-maps"
      },
      logGroup: presignUploadLogGroup,
    });

    // Grant permission to write to S3 receipts bucket
    receiptsBucket.grantPut(this.presignUploadFn);

    // Resource 6: Lambda for dashboard API (real logic shipped by backend pipeline)
    // Create LogGroup for dashboard API Lambda
    this.dashboardFn = new lambda.Function(this, "DashboardFn", {
      functionName: name(app, domain, stage, "dashboard"),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      logGroup: new logs.LogGroup(this, 'DashboardFnLogGroup', {
        logGroupName: `/aws/lambda/${name(app, domain, stage, "dashboard")}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    receiptsTable.grantReadData(this.dashboardFn);


    // Resource 7: Lambda for receipt history API (real logic shipped by backend pipeline)
    // Create LogGroup for receipt history API Lambda
    this.receiptHistoryFn = new lambda.Function(this, "ReceiptHistoryFn", {
      functionName: name(app, domain, stage, "receipt-history"),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      logGroup: new logs.LogGroup(this, 'ReceiptHistoryFnLogGroup', {
        logGroupName: `/aws/lambda/${name(app, domain, stage, "receipt-history")}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    receiptsTable.grantReadData(this.receiptHistoryFn);

    // Resource 8: Lambda for receipt details API (real logic shipped by backend pipeline)
    // Create LogGroup for receipt details API Lambda
    this.receiptDetailsFn = new lambda.Function(this, "ReceiptDetailsFn", {
      functionName: name(app, domain, stage, "receipt-details"),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      logGroup: new logs.LogGroup(this, 'ReceiptDetailsFnLogGroup', {
        logGroupName: `/aws/lambda/${name(app, domain, stage, "receipt-details")}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    receiptsTable.grantReadData(this.receiptDetailsFn);
    receiptsBucket.grantRead(this.receiptDetailsFn);

    // Resource 9: Lambda for updating receipt details API (real logic shipped by backend pipeline)
    // Create LogGroup for updating receipt details API Lambda
    this.updateReceiptFn = new lambda.Function(this, "UpdateReceiptFn", {
      functionName: name(app, domain, stage, "update-receipt"),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      code: lambda.Code.fromAsset("assets/placeholders/"),
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      logGroup: new logs.LogGroup(this, 'UpdateReceiptFnLogGroup', {
        logGroupName: `/aws/lambda/${name(app, domain, stage, "update-receipt")}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }),
    });

    receiptsTable.grantReadWriteData(this.updateReceiptFn);
    receiptsBucket.grantReadWrite(this.updateReceiptFn);


    // Resource 10: API Gateway
    const api = new apigw.RestApi(this, 'receiptcat-api', {
      restApiName: name(app, domain, stage, "api"),
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000', 'http://192.168.1.32:3000', frontendUrl],
        allowMethods: ['OPTIONS', 'POST', 'GET', 'PUT'],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: { stageName: stage },
    });

    // Add CORS headers to API Gateway default error responses (4XX/5XX)
    api.addGatewayResponse('Default4XX', {
      type: apigw.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'OPTIONS,POST,GET'",
      },
    });
    api.addGatewayResponse('Default5XX', {
      type: apigw.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'OPTIONS,POST,GET'",
      },
    });

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const upload = api.root.addResource('upload')
    const presign = upload.addResource('presign')
    presign.addMethod('POST', new apigw.LambdaIntegration(this.presignUploadFn), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    })

    // API routes for receipts-api
    const usersResource = api.root.addResource("users");
    const userIdResource = usersResource.addResource("{userId}");
    const dashboardResource = userIdResource.addResource("dashboard");
    const receiptsResource = userIdResource.addResource("receipts");
    const receiptResource = receiptsResource.addResource("{receiptId}");

    const dashboardIntegration = new apigw.LambdaIntegration(this.dashboardFn);
    const receiptHistoryIntegration = new apigw.LambdaIntegration(this.receiptHistoryFn);
    const receiptDetailsIntegration = new apigw.LambdaIntegration(this.receiptDetailsFn);
    const updateReceiptIntegration = new apigw.LambdaIntegration(this.updateReceiptFn);


    // GET endpoint for Receipt History
    receiptsResource.addMethod("GET", receiptHistoryIntegration, {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // GET endpoint for Dashboard
    dashboardResource.addMethod("GET", dashboardIntegration, {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // GET endpoint for Receipt Details
    receiptResource.addMethod("GET", receiptDetailsIntegration, {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    // PUT endpoint for Receipt Details
    receiptResource.addMethod("PUT", updateReceiptIntegration, {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer,
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      exportName: name(app, domain, stage, 'api')
    })
    new cdk.CfnOutput(this, 'PresignFnName', { value: this.presignUploadFn.functionName })
    new cdk.CfnOutput(this, 'ReceiptsBucketName', { value: receiptsBucket.bucketName })
    new cdk.CfnOutput(this, 'ReceiptsBucketArn', { value: receiptsBucket.bucketArn })
    new cdk.CfnOutput(this, 'DashboardFnName', { value: this.dashboardFn.functionName });
    new cdk.CfnOutput(this, 'ReceiptHistoryFnName', { value: this.receiptHistoryFn.functionName });
    new cdk.CfnOutput(this, 'ReceiptDetailsFnName', { value: this.receiptDetailsFn.functionName });
    new cdk.CfnOutput(this, 'UpdateReceiptFnName', { value: this.updateReceiptFn.functionName });
  }
}
