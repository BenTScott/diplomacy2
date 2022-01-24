import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {CodeBuildAction, GitHubSourceAction, GitHubTrigger} from "aws-cdk-lib/aws-codepipeline-actions";
import {BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject} from "aws-cdk-lib/aws-codebuild";
import {PolicyDocument, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {EcrStack} from "./ecr-stack";
import {LambdaStack} from "./lambda-stack";

export class CodePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const pipe = new Pipeline(this, 'CodePipeline', {
      pipelineName: 'DiplomacyDeployPipeline',
      restartExecutionOnUpdate: true
    });

    const source = new Artifact('SourceCode')

    pipe.addStage({
      stageName: 'Source',
      actions: [
          new GitHubSourceAction({
            actionName: 'Github',
            owner: 'BenTScott',
            repo: 'diplomacy2',
            oauthToken: SecretValue.secretsManager('github-token'),
            output: source,
            trigger: GitHubTrigger.POLL
          }),
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
              buildSpec: BuildSpec.fromObject({
                version: 0.2,
                phases: {
                  build: {
                    commands: [
                      'cd infra',
                      'npm ci',
                      'npm run build',
                      'npx cdk synth',
                    ]
                  },
                },
                artifacts: {
                  "base-directory": "infra/cdk.out",
                  files: "**/*"
                }
              })
            })
          })
      ]
    })

    // To do: generate from iterating over the directory
    const commands = ['auth']


    const repoStack = new EcrStack(this, 'EcrStack', { commands });

    const cdkDeploy = getCdkDeployProject(this);

    pipe.addStage({
      stageName: 'Deploy_Pipeline',
      actions: [
        getCodeBuildAction('Deploy_CDK_Pipeline', cdk, cdkDeploy, this.node.path, 1),
        getCodeBuildAction('Deploy_Repositories', cdk, cdkDeploy, repoStack.node.path, 2),
      ]
    });

    const environment = Object.entries(repoStack.repositories).map(x => x[0] + '|' + x[1].repositoryUri).join(';')

    const lambdaDeployRole = new Role(this, 'LambdaDeployRole', {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    });

    Object.values(repoStack.repositories).forEach(x => x.grantPullPush(lambdaDeployRole))

    const lambdaStack = new LambdaStack(this, 'LambdaStack', { repositories: repoStack.repositories })

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
              role: lambdaDeployRole
            })
          }),
          getCodeBuildAction('Deploy_Lambda', cdk, cdkDeploy, lambdaStack.node.path, 2)
      ]
    })
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
    buildSpec: BuildSpec.fromObject({
      version: 0.2,
      phases: {
        install: {
          commands: "npm install -g aws-cdk"
        },
        build: {
          commands: [
            `cdk -a . deploy $STACK --require-approval=never --verbose`
          ]
        }
      }
    }),
    role: deployRole
  });
}

function getCodeBuildAction(actionName: string, artifact: Artifact, project: PipelineProject, stack: string, runOrder: number | undefined) : CodeBuildAction {
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
