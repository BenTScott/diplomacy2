import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from "aws-cdk-lib/pipelines";

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'DiplomacyPipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('BenTScott/diplomacy2','master', {
          authentication: SecretValue.secretsManager('github-token')
        }),
        commands: [
          'cd infra',
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'infra/cdk.out'
      }),
    });
  }
}
