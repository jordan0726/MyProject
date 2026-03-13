import { ArnFormat, Stack, StackProps } from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { name } from "../../../helpers/names";

export interface FrontendPipelineProps extends StackProps {
    sourceRepoName: string;
    sourceBranch: string;
    app: string;
    domain: 'frontend';
    stage: string;
    coverageMinPercent?: number,
    artifactsBucket: s3.IBucket,
    reportsBucket: s3.IBucket
}

export class FrontendPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: FrontendPipelineProps) {
        super(scope, id, props);

        const { env, sourceRepoName, sourceBranch, app, domain, stage, coverageMinPercent, artifactsBucket, reportsBucket } = props;
        const coverageMin = coverageMinPercent ?? 80;

        // Source repo (frontend)
        const frontendRepo = codecommit.Repository.fromRepositoryName(
            this, "FrontendRepo", sourceRepoName
        );

        // CodeBuild: Build
        const buildProject = new codebuild.PipelineProject(this, "FrontendBuild", {
            projectName: `${app}-${domain}-${stage}-build`,
            environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
            environmentVariables: {
                ENVIRONMENT: { value: stage },
                STAGE: { value: stage }
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-build.yml")
        });

        // CodeBuild: Unit Test
        const unitTestProject = new codebuild.PipelineProject(this, "FrontendUnitTest", {
            projectName: `${app}-${domain}-${stage}-unit-test`,
            environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
            environmentVariables: {
                ENVIRONMENT: { value: stage },
                REPORTS_BUCKET: { value: `${app}-test-results` },
                REPORTS_PREFIX: { value: `${app}-${domain}/test-reports/${stage}` },
                COVERAGE_MIN: { value: String(coverageMin) }
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-unittest.yml")
        });

        // CodeBuild: Integration Test
        const integrationTestProject = new codebuild.PipelineProject(this, "FrontendIntegrationTest", {
            projectName: `${app}-${domain}-${stage}-integration-test`,
            environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
            environmentVariables: {
                ENVIRONMENT: { value: stage },
                REPORTS_BUCKET: { value: `${app}-test-results` },
                REPORTS_PREFIX: { value: `${app}-${domain}/test-reports/${stage}` },
                COVERAGE_MIN: { value: String(coverageMin) }
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-integrationtest.yml")
        });

        [unitTestProject, integrationTestProject].forEach((proj) => {
            // object-level (put/get/delete) for the specific prefix
            proj.addToRolePolicy(new iam.PolicyStatement({
                actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
                resources: [
                    reportsBucket.arnForObjects(`${app}-${domain}/test-reports/${stage}/*`)
                ],
            }));
            // list on the bucket, restricted to that prefix (needed for `aws s3 sync`)
            proj.addToRolePolicy(new iam.PolicyStatement({
                actions: ["s3:ListBucket"],
                resources: [reportsBucket.bucketArn],
                conditions: {
                    StringLike: {
                        "s3:prefix": [
                            `${app}-${domain}/test-reports/${stage}`,
                            `${app}-${domain}/test-reports/${stage}/*`,
                        ],
                    },
                },
            }));
        });

        const paramPrefix = `/${app}/${stage}/${domain}`;
        const bucketParam = `${paramPrefix}/site-bucket`;
        const distIdParam = `${paramPrefix}/distribution-id`;
        const distDomainParam = `${paramPrefix}/cloudfront-domain-name`;
        const cloudInvalidationPaths = "/index.html /404.html /service-worker.js /_next/static/*";

        // CodeBuild: Deploy
        const deployProject = new codebuild.PipelineProject(this, "FrontnendDeploy", {
            projectName: `${app}-${domain}-${stage}-deploy`,
            environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
            environmentVariables: {
                ENVIRONMENT: { value: stage },
                SITE_BUCKET: {
                    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    value: bucketParam,
                },
                DISTRIBUTION_ID: {
                    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    value: distIdParam,
                },
                CF_DOMAIN: {
                    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
                    value: distDomainParam,
                },
                CF_INVALIDATION_PATHS: { value: cloudInvalidationPaths },
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-deploy.yml")
        });

        const siteBucketName = ssm.StringParameter.valueForStringParameter(this, bucketParam);
        const distributionId = ssm.StringParameter.valueForStringParameter(this, distIdParam);

        const siteBucketArn = this.formatArn({
            service: "s3",
            resource: siteBucketName,               
            arnFormat: ArnFormat.NO_RESOURCE_NAME,  
            region: "",                             
            account: "",
        });

        const siteBucketObjectsArn = this.formatArn({
            service: "s3",
            resource: siteBucketName,
            resourceName: "*",
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            region: "",
            account: "",
        });

        const cloudFrontDistArn = this.formatArn({
            service: "cloudfront",
            resource: "distribution",
            resourceName: distributionId,
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            region: "",
        });

        const ssmParams = [bucketParam, distIdParam, distDomainParam];
        const ssmParamArns = ssmParams.map(p =>
            this.formatArn({
                service: "ssm",
                resource: "parameter",
                resourceName: p.replace(/^\//, ""),   // drop leading '/'
                arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            })
        );

        // Allow Build to read SSM env parameters used at build time
        const envParamPath = `/${app}/${stage}/${domain}/env/*`;
        const envParamArn = this.formatArn({
            service: "ssm",
            resource: "parameter",
            resourceName: envParamPath.replace(/^\//, ""),
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
        });
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ["ssm:GetParameter", "ssm:GetParameters"],
            resources: [envParamArn],
        }));

        deployProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ["ssm:GetParameter", "ssm:GetParameters"],
            resources: ssmParamArns,
        }));

        deployProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ["s3:ListBucket","s3:GetBucketLocation"],
            resources: [siteBucketArn],
        }));

        deployProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
            resources: [siteBucketObjectsArn],
        }));

        deployProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ["cloudfront:CreateInvalidation"],
            resources: [cloudFrontDistArn],
        }));

        // Pipeline
        const pipeline = new codepipeline.Pipeline(this, name(app, domain, stage, 'pipeline').toLowerCase(), {
            artifactBucket: artifactsBucket,
            pipelineName: `${app}-${domain}-${stage}-pipeline`
        });

        const sourceOutput = new codepipeline.Artifact("Source");
        const buildOutput = new codepipeline.Artifact("BuildOut");

        pipeline.addStage({
            stageName: "Source",
            actions: [new actions.CodeCommitSourceAction({
                actionName: "Checkout",
                repository: frontendRepo,
                branch: sourceBranch,
                output: sourceOutput,
            })]
        });

        pipeline.addStage({
            stageName: "Build",
            actions: [new actions.CodeBuildAction({
                actionName: "Build",
                project: buildProject,
                input: sourceOutput,
                outputs: [buildOutput]
            })]
        });

        pipeline.addStage({
            stageName: "UnitTest",
            actions: [new actions.CodeBuildAction({
                actionName: "UnitTest",
                project: unitTestProject,
                input: sourceOutput,
            })]
        });

        pipeline.addStage({
            stageName: "IntegrationTest",
            actions: [new actions.CodeBuildAction({
                actionName: "IntegrationTest",
                project: integrationTestProject,
                input: sourceOutput,
            })]
        });

        pipeline.addStage({
            stageName: "Deploy",
            actions: [new actions.CodeBuildAction({
                actionName: "Deploy",
                project: deployProject,
                input: sourceOutput,
                extraInputs: [buildOutput]
            })]
        });
    }
}
