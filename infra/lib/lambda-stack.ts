import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {DockerImageCode, DockerImageFunction} from "aws-cdk-lib/aws-lambda";

export interface LambdaStackProps extends StackProps {
  repositories: { [command: string]: Repository };
}

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    for (const command in props.repositories) {
      new DockerImageFunction(this, capitalize(command) + 'Function', {
        code: DockerImageCode.fromEcr(props.repositories[command])
      })
    }
  }
}
