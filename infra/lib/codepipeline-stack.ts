import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from "aws-cdk-lib/pipelines";
import {AppStage} from "./app-stage";
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {
  CloudFormationExecuteChangeSetAction,
  CodeBuildAction,
  GitHubSourceAction,
  GitHubTrigger
} from "aws-cdk-lib/aws-codepipeline-actions";
import {BuildSpec, LinuxBuildImage, PipelineProject} from "aws-cdk-lib/aws-codebuild";
import {createRole} from "aws-cdk-lib/aws-autoscaling-hooktargets";
import {
  AccountRootPrincipal,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";

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

    const deployRole = new Role(this, 'DeployRole', {
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

    pipe.addStage({
      stageName: 'Deploy_Pipeline',
      actions: [
        new CodeBuildAction({
          input: cdk,
          actionName: 'Deploy_CDK_Pipeline',
          project: new PipelineProject(this, 'MutateProject', {
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
                    "cdk -a . deploy DiplomacyCodePipelineStack --require-approval=never --verbose"
                  ]
                }
              }
            }),
            role: deployRole
          })
        })
      ]
    })
  }
}
