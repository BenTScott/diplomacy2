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
import {StringListParameter} from "aws-cdk-lib/aws-ssm";

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
      stageName: 'BuildCDK',
      actions: [
          new CodeBuildAction({
            input: source,
            actionName: 'BuildCDK',
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
      stageName: 'DeployPipelineAndRepos',
      actions: [
        getCodeBuildAction('DeployCDKPipelineAndRepos', cdk, cdkDeploy, `${this.node.path} ${repoStack.node.path}`),
      ]
    });

    const codeBuildSP = new ServicePrincipal('codebuild.amazonaws.com');

    const lambdaDeployRole = new Role(this, 'LambdaDeployRole', {
      assumedBy: codeBuildSP
    });

    Object.values(repoStack.repositories).forEach(x => x.grantPullPush(lambdaDeployRole))

    const lambdaStack = new LambdaStack(this, 'LambdaStack', { repositories: repoStack.repositories })

    const commandUriMapping = new StringListParameter(this, 'CommandUriMapping', {
      stringListValue: Object.entries(repoStack.repositories).map(x => x[0] + '|' + x[1].repositoryUri),
    });

    commandUriMapping.grantRead(codeBuildSP);

    const functionArns = Object.values(lambdaStack.functions).map(x => x.functionArn);

    const functionList = new StringListParameter(this, 'FunctionList', {
      stringListValue: functionArns
    });

    functionList.grantRead(codeBuildSP);

    const lambdaUpdateRole = new Role(this, 'LambdaUpdateRole', {
      assumedBy: codeBuildSP,
      inlinePolicies: {
        "LambdaPolicies": new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["lambda:GetFunction", "lambda:UpdateFunctionCode"],
              resources: functionArns
            }),
          ]
        })}
    });

    pipe.addStage({
      stageName: 'BuildLambda',
      actions: [
        new CodeBuildAction({
          input: source,
          actionName: 'BuildLambdaImages',
          runOrder: 1,
          project: new PipelineProject(this, 'BuildLambdaProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
              privileged: true
            },
            environmentVariables: {
              AWS_ACCOUNT_ID: {
                type: BuildEnvironmentVariableType.PLAINTEXT,
                value: this.account
              },
              LAMBDAS: {
                type: BuildEnvironmentVariableType.PARAMETER_STORE,
                value: commandUriMapping.parameterName
              }
            },
            buildSpec: BuildSpec.fromSourceFilename('./buildspec.yml'),
            role: lambdaDeployRole,
            cache: Cache.local(LocalCacheMode.DOCKER_LAYER)
          })
        }),
        getCodeBuildAction('DeployLambda', cdk, cdkDeploy, lambdaStack.node.path, 2),
        new CodeBuildAction({
          input: source,
          actionName: 'UpdateLambdaFunctions',
          runOrder: 2,
          project: new PipelineProject(this, 'UpdateLambdaProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            environmentVariables: {
              FUNCTIONS: {
                type: BuildEnvironmentVariableType.PARAMETER_STORE,
                value: functionList.parameterName
              }
            },
            buildSpec: BuildSpec.fromSourceFilename('./deployLambda.yml'),
            role: lambdaUpdateRole
          })
        }),
      ]
    })

    const apiStack = new ApiStack(this, 'ApiStack', { functions: lambdaStack.functions })

    pipe.addStage({
      stageName: 'DeployAPI',
      actions: [
          getCodeBuildAction('DeployAPI', cdk, cdkDeploy, apiStack.node.path)
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
      buildImage: LinuxBuildImage.AMAZON_LINUX_2_3,
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
