import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {
  CodeBuildAction,
  GitHubSourceAction,
  GitHubTrigger
} from "aws-cdk-lib/aws-codepipeline-actions";
import {BuildSpec, LinuxBuildImage, PipelineProject} from "aws-cdk-lib/aws-codebuild";
import {
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import {LambdaStack} from "./lambda-stack";
import {SharedRole} from "../constructs/SharedRole";

export class CodePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const pipe = new Pipeline(this, 'CodePipeline', {
      pipelineName: 'DiplomacyDeployPipeline',
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
          })
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
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_2
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

    new LambdaStack(this, 'AuthLambdaStack', { command: 'auth' })

    pipe.addStage({
      stageName: 'Deploy_Pipeline',
      actions: [
        getCdkDeployAction(this, 'Deploy_CDK_Pipeline', 'DiplomacyCodePipelineStack', cdk, 1),
        getCdkDeployAction(this, 'Deploy_Infrastructure', 'DiplomacyCodePipelineStack/*', cdk, 2),
      ]
    });
  }
}

function getCdkDeployAction(scope: Construct, actionName: string, stackName: string, cdkArtifact: Artifact, runOrder: number | undefined) : CodeBuildAction {
  const deployRole = SharedRole.getRole(scope, 'DeployRole', {
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

  return new CodeBuildAction({
    input: cdkArtifact,
    actionName,
    runOrder,
    project: new PipelineProject(scope, actionName + 'Project', {
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
              `cdk -a . deploy ${stackName} --require-approval=never --verbose`
            ]
          }
        }
      }),
      role: deployRole
    })
  })
}
