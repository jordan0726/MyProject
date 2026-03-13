import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";

import { Construct } from "constructs";
import { Runtime } from "aws-cdk-lib/aws-lambda";

export class ReceiptCatEvaluationTextractStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const textractLambdaRole = iam.Role.fromRoleArn(this, "TextractProcessorRole", "arn:aws:iam::080205649503:role/ReceiptCAT_TextractProcessor_Role");

    // Resource 1: S3 bucket for uploading receipts
    // Note: Use this snippet if you intend to create a new S3 bucket
    const receiptsBucket = new s3.Bucket(this, "ReceiptsBucket", {
      bucketName: "receiptcat-textract-eval-receipts",
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    // Note: Use this snippet if you intend to reuse an existing S3 bucket
    // const receiptsBucket = s3.Bucket.fromBucketName(this, "ReceiptsBucket", "receiptcat-poc-ai-eval-receipts");

    // Resource 2: DynamoDB table for receipts
    // Note: Use this snippet if you intend to create a new table
    const receiptsTable = new dynamodb.Table(this, "AIEvalTable", {
      tableName: "receiptcat_textract_eval_receipts",
      partitionKey: { name: "receipt_id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });
    // Note: Use this snippet if you intend to reuse an existing table
    // const receiptsTable = dynamodb.Table.fromTableName(this, "AIEvalTable", "receiptcat_poc_ai_eval_receipts");

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

    // Resource 3: Receipt Extractor Lambda function (Repurposed for this evaluation)
    const textractProcessor = new lambdaNodejs.NodejsFunction(this, "TextractProcessorFn", {
      entry: "./textract-evaluation-infra/lambda/ai-textract-eval.ts",
      handler: "ExtractReceiptData",
      runtime: Runtime.NODEJS_20_X,
      functionName: "ReceiptCAT-AI-Eval-TextractProcessor",
      description: "Textract Evaluation Tool",
      timeout: cdk.Duration.minutes(1),
      memorySize: 1000,
      environment: {
        RECEIPTS_TABLE: receiptsTable.tableName
      },
      role: textractLambdaRole,
    });

    // Grant permissions to textractProcessor
    receiptsBucket.grantRead(textractProcessor);
    receiptsTable.grantWriteData(textractProcessor);

    // Add S3 event notification to trigger textractProcessor on object creation
    receiptsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(textractProcessor)
    );
  }
}
