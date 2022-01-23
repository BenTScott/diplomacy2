import {RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";

export interface EcrStackProps extends StackProps {
  commands: string[]
}

export class EcrStack extends Stack {
  repositories: { [command: string]: Repository };

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);
    this.repositories = {};

    for (const command of props.commands) {
      this.repositories[command] = new Repository(this, capitalize(command) + 'Repository', {
        lifecycleRules: [{maxImageCount: 10}],
        removalPolicy: RemovalPolicy.DESTROY
      });
    }

    //buildArgs: { "cmd": props.command }
  }
}
