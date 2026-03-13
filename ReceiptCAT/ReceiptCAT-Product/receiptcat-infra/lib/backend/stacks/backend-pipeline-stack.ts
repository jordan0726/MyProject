import { ArnFormat, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { name } from "../../../helpers/names";

export interface BackendPipelineProps extends StackProps {
  sourceRepoName: string;
  sourceBranch: string;
  app: string;
  domain: 'backend';
  stage: string,
  coverageMinPercent?: number,
  artifactsBucket: s3.IBucket,
  reportsBucket: s3.IBucket
}

export class BackendPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: BackendPipelineProps) {
    super(scope, id, props);

    const { sourceRepoName, sourceBranch, app, domain, stage, coverageMinPercent, artifactsBucket, reportsBucket } = props;
    const coverageMin = coverageMinPercent ?? 80;

    // Source repo (backend)
    const backendRepo = codecommit.Repository.fromRepositoryName(
      this, "BackendRepo", sourceRepoName
    );

    // CodeBuild: Build
    const buildProject = new codebuild.PipelineProject(this, "BackendBuild", {
      projectName: `${app}-${domain}-${stage}-build`,
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      environmentVariables: {
        ENVIRONMENT: { value: stage }
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-build.yml")
    });

    // CodeBuild: Test
    const testProject = new codebuild.PipelineProject(this, "BackendTest", {
      projectName: `${app}-${domain}-${stage}-test`,
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      environmentVariables: {
        ENVIRONMENT: { value: stage },
        REPORTS_BUCKET: { value: `${app}-test-results` },
        REPORTS_PREFIX: { value: `${app}-${domain}/test-reports/${stage}` },
        COVERAGE_MIN: { value: String(coverageMin) }
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-test.yml")
    });

    // CodeBuild: Deploy
    const deployProject = new codebuild.PipelineProject(this, "BackendDeploy", {
      projectName: `${app}-${domain}-${stage}-deploy`,
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      environmentVariables: {
        ENVIRONMENT: { value: stage },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec-deploy.yml")
    });

    // IAM for deploy to call Lambda + S3 + CodeDeploy
    testProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      resources: [reportsBucket.arnForObjects(`${app}-${domain}/test-reports/${stage}/*`)]
    }));
    testProject.addToRolePolicy(new iam.PolicyStatement({
      actions: ["s3:ListBucket"],
      resources: [reportsBucket.bucketArn],
      conditions: {
        StringLike: {
          "s3:prefix": [
            `${app}-${domain}/test-reports/${stage}`,
            `${app}-${domain}/test-reports/${stage}/*`
          ]
        }
      }
    }));
    const lambdaFnWildcardArn = this.formatArn({
      service: "lambda",
      resource: "function",
      resourceName: `${app}-${domain}-${stage}-*`,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME
    });
    deployProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "lambda:UpdateFunctionCode",
        "lambda:PublishVersion",
        "lambda:GetFunction"
      ],
      resources: [lambdaFnWildcardArn]
    }));

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, name(app, domain, stage, 'pipeline').toLowerCase(), {
      artifactBucket: artifactsBucket,
      pipelineName: `${app}-${domain}-${stage}-pipeline`
    });

    const sourceOutput = new codepipeline.Artifact("Source");
    const buildOutput  = new codepipeline.Artifact("BuildOut");

    pipeline.addStage({
      stageName: "Source",
      actions: [new actions.CodeCommitSourceAction({
        actionName: "Checkout",
        repository: backendRepo,
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
      stageName: "Test",
      actions: [new actions.CodeBuildAction({
        actionName: "Test",
        project: testProject,
        input: sourceOutput,
      })]
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [new actions.CodeBuildAction({
        actionName: "DeployLambda",
        project: deployProject,
        input: sourceOutput
      })]
    });
  }
}
