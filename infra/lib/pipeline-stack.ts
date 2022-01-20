import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Artifact} from "aws-cdk-lib/aws-codepipeline";
import {CodePipeline, CodePipelineSource, ShellStep} from "aws-cdk-lib/pipelines";

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const pipeline = new CodePipeline(this, 'Pipeline', {
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('diplomacy2','master', {
          authentication: SecretValue.secretsManager('github-token')
        }),
        commands: [
          'cd infra',
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
    });
  }
}
