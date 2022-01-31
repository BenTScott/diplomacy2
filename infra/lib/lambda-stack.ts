import {SecretValue, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {DockerImageCode, DockerImageFunction, Function } from "aws-cdk-lib/aws-lambda";
import {Secret} from "aws-cdk-lib/aws-secretsmanager";

export interface LambdaStackProps extends StackProps {
  repositories: { [command: string]: Repository };
}

export class LambdaStack extends Stack {
  functions: { [command: string]: Function };

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    this.functions = {};

    const secret = new Secret(this, 'AccessTokenSecret')

    for (const command in props.repositories) {
      this.functions[command] = new DockerImageFunction(this, capitalize(command) + 'Function', {
        code: DockerImageCode.fromEcr(props.repositories[command]),
        environment: {
          "ACCESS_TOKEN_SECRET": secret.secretArn
        }
      })

      secret.grantRead(this.functions[command])
    }
  }
}
