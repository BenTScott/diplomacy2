import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {CodeBuildAction, GitHubSourceAction, GitHubTrigger} from "aws-cdk-lib/aws-codepipeline-actions";
import {
  BuildEnvironmentVariableType,
  BuildSpec,
  Cache,
  LinuxBuildImage,
  LocalCacheMode,
  PipelineProject
} from "aws-cdk-lib/aws-codebuild";
import {PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {EcrStack} from "./ecr-stack";
import {LambdaStack} from "./lambda-stack";
import {ApiStack} from "./api-stack";

export class CodePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const pipe = new Pipeline(this, 'CodePipeline', {
      pipelineName: 'DiplomacyDeployPipeline',
      restartExecutionOnUpdate: true
    });

    const source = new Artifact('SourceCode')

    const sourceAction = new GitHubSourceAction({
      actionName: 'Github',
      owner: 'BenTScott',
      repo: 'diplomacy2',
      oauthToken: SecretValue.secretsManager('github-token'),
      output: source,
      trigger: GitHubTrigger.POLL
    });

    pipe.addStage({
      stageName: 'Source',
      actions: [
        sourceAction
      ]
    });

    const cdk = new Artifact('CDK')

    pipe.addStage({
      stageName: 'Build_CDK',
      actions: [
          new CodeBuildAction({
            input: source,
            actionName: 'Build_CDK',
            outputs: [ cdk ],
            project: new PipelineProject(this, 'SynthProject', {
              environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0
              },
              buildSpec: BuildSpec.fromSourceFilename('infra/synth-buildspec.yml'),
            })
          })
      ]
    })

    // To do: generate from iterating over the directory
    const commands = ['auth', 'user', 'login']

    const repoStack = new EcrStack(this, 'EcrStack', { commands });

    const cdkDeploy = getCdkDeployProject(this);

    pipe.addStage({
      stageName: 'Deploy_Pipeline_And_Repos',
      actions: [
        getCodeBuildAction('Deploy_CDK_Pipeline_And_Repos', cdk, cdkDeploy, `${this.node.path} ${repoStack.node.path}`),
      ]
    });

    const environment = Object.entries(repoStack.repositories).map(x => x[0] + '|' + x[1].repositoryUri).join(';')

    const lambdaDeployRole = new Role(this, 'LambdaDeployRole', {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    });

    Object.values(repoStack.repositories).forEach(x => x.grantPullPush(lambdaDeployRole))

    const lambdaStack = new LambdaStack(this, 'LambdaStack', { repositories: repoStack.repositories, tag: sourceAction.variables.commitId })

    pipe.addStage({
      stageName: 'Build_Lambda',
      actions: [
          new CodeBuildAction({
            input: source,
            actionName: 'Build_Lambda_Images',
            runOrder: 1,
            project: new PipelineProject(this, 'BuildLambdaProject', {
              environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
                privileged: true
              },
              environmentVariables: {
                LAMBDAS: {
                  type: BuildEnvironmentVariableType.PLAINTEXT,
                  value: environment
                },
                AWS_ACCOUNT_ID: {
                  type: BuildEnvironmentVariableType.PLAINTEXT,
                  value: this.account
                }
              },
              buildSpec: BuildSpec.fromSourceFilename('./buildspec.yml'),
              role: lambdaDeployRole,
              cache: Cache.local(LocalCacheMode.DOCKER_LAYER)
            })
          }),
          getCodeBuildAction('Deploy_Lambda', cdk, cdkDeploy, lambdaStack.node.path, 2),
      ]
    })

    const apiStack = new ApiStack(this, 'ApiStack', { functions: lambdaStack.functions })

    pipe.addStage({
      stageName: 'Deploy_API',
      actions: [
          getCodeBuildAction('Deploy_API', cdk, cdkDeploy, apiStack.node.path)
      ]
    });
  }
}

function getCdkDeployProject(scope: Construct) : PipelineProject {
  const deployRole = new Role(scope, 'DeployRole', {
    assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    inlinePolicies: {
      "CDKDeploy": new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ["sts:AssumeRole"],
            resources: ["arn:aws:iam::*:role/cdk-*"]
          }),
        ]
      })}
  });

  return new PipelineProject(scope, 'CDKDeployProject', {
    environment: {
      buildImage: LinuxBuildImage.AMAZON_LINUX_2_2,
      privileged: true
    },
    buildSpec: BuildSpec.fromSourceFilename('./deploy-buildspec.yml'),
    role: deployRole
  });
}

function getCodeBuildAction(actionName: string, artifact: Artifact, project: PipelineProject, stack: string, runOrder?: number) : CodeBuildAction {
  return new CodeBuildAction({
    input: artifact,
    actionName,
    runOrder,
    project: project,
    environmentVariables: {
      STACK: {
        type: BuildEnvironmentVariableType.PLAINTEXT,
        value: stack
      }
    }
  })
}
