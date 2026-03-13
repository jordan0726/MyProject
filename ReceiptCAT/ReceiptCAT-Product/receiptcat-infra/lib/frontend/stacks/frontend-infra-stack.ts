import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontS3 from '@aws-solutions-constructs/aws-cloudfront-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { name } from "../../../helpers/names";
import { createRewriteHtmlFunction } from "./../cloudfront-functions/rewrite-html";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";

export interface FrontendInfraProps extends StackProps {
    stage: string;
    app: string;
    domain: 'frontend';
    manageResources?: boolean;
    publicEnv?: Record<string,string>;
}

export class FrontendInfraStack extends Stack {
    constructor(scope: Construct, id: string, props: FrontendInfraProps) {
        super(scope, id, props);

        const { app, domain, stage, } = props;
        const manage = props.manageResources ?? (stage === 'dev' || stage === 'feature');

        const isProd = stage === 'prod';
        const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
        const autoDeleteObjects = !isProd;

        const paramPrefix = `/${app}/${stage}/${domain}`;
        const bucketParam = `${paramPrefix}/site-bucket`;
        const distIdParam = `${paramPrefix}/distribution-id`;
        const distDomainParam = `${paramPrefix}/cloudfront-domain-name`;
        const envParamPrefix = `${paramPrefix}/env`;

        let siteBucketName: string;
        let distributionId: string;
        let distributionDomainName: string | undefined;

        const cloudFrontName = name(app, domain, stage, 'ReceiptCAT-CloudFrontToS3');

        if (manage) {
            const pattern = new cloudfrontS3.CloudFrontToS3(this, cloudFrontName, {
                //Content bucket
                bucketProps: {
                    removalPolicy,
                    autoDeleteObjects
                },
                //S3 access logs bucket (for the content bucket)
                loggingBucketProps: {
                    removalPolicy,
                    autoDeleteObjects
                },
                //creates a CloudFront log bucket for production stage
                cloudFrontDistributionProps: {
                    enableLogging: isProd,
                    defaultRootObject: "index.html",
                    // SPA deep-link fallback
                    errorResponses: [
                        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
                        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
                    ],
                },
                // CloudFront logs bucket
                cloudFrontLoggingBucketProps: {
                    removalPolicy,
                    autoDeleteObjects
                },
                //S3 access logs for the CloudFront log bucket 
                cloudFrontLoggingBucketAccessLogBucketProps: {
                    removalPolicy, autoDeleteObjects
                },
                insertHttpSecurityHeaders: false,
            });

            const rewriteFn = createRewriteHtmlFunction(this, app, domain, stage);
            const origin = S3BucketOrigin.withOriginAccessIdentity(pattern.s3Bucket!);

            siteBucketName = pattern.s3Bucket!.bucketName;
            const dist = pattern.cloudFrontWebDistribution;

            dist.addBehavior('/*', origin, {
                functionAssociations: [
                    {
                        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
                        function: rewriteFn
                    }
                ],
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            });

            siteBucketName = pattern.s3Bucket!.bucketName;
            distributionId = dist.distributionId;
            distributionDomainName = dist.domainName;

            //creating SSM params to store the site bucket name, distribution ID and distribution domain name
            new ssm.StringParameter(this, "site-bucket-param", {
                parameterName: bucketParam,
                stringValue: siteBucketName,
            });
            new ssm.StringParameter(this, "distribution-id-param", {
                parameterName: distIdParam,
                stringValue: distributionId,
            });
            new ssm.StringParameter(this, "distribution-domain-name-param", {
                parameterName: distDomainParam,
                stringValue: distributionDomainName,
            });

            // Optionally seed public env variables into SSM for build-time consumption
            if (props.publicEnv) {
                const keys = [
                    'NEXT_PUBLIC_OIDC_AUTHORITY',
                    'NEXT_PUBLIC_COGNITO_DOMAIN',
                    'NEXT_PUBLIC_COGNITO_CLIENT_ID',
                    'NEXT_PUBLIC_OIDC_REDIRECT_URI',
                    'NEXT_PUBLIC_POST_LOGOUT_URL',
                    'NEXT_PUBLIC_API_BASE',
                    'USER_POOL_ID',
                    'CYPRESS_TEST_USERNAME',
                    'CYPRESS_TEST_PASSWORD',
                    'CYPRESS_FRONTEND_BASE_URL'
                ] as const;

                for (const key of keys) {
                    const value = props.publicEnv[key];
                    if (value) {
                        new ssm.StringParameter(this, `env-${key}`, {
                            parameterName: `${envParamPrefix}/${key}`,
                            stringValue: value,
                        });
                    }
                }
            }
        } else {
            siteBucketName = ssm.StringParameter.valueForStringParameter(this, bucketParam);
            distributionId = ssm.StringParameter.valueForStringParameter(this, distIdParam);
            distributionDomainName = ssm.StringParameter.valueForStringParameter(this, distDomainParam);
        }

        new cdk.CfnOutput(this, "SiteBucketName", {
            value: siteBucketName,
            description: 'S3 bucket for site hosting',
        });
        new cdk.CfnOutput(this, "DistributionId", {
            value: distributionId,
            description: 'CloudFront distribution ID',
        });
        if (distributionDomainName) {
            new cdk.CfnOutput(this, "SiteUrl", {
                value: `https://${distributionDomainName}`,
                description: "CloudFront URL",
            });
        }  
    }
}