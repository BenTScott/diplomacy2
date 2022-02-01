import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {Alias, DockerImageCode, DockerImageFunction, Function} from "aws-cdk-lib/aws-lambda";
import {Secret} from "aws-cdk-lib/aws-secretsmanager";
import {LambdaDeploymentGroup} from "aws-cdk-lib/aws-codedeploy";

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
      const func = new DockerImageFunction(this, capitalize(command) + 'Function', {
        code: DockerImageCode.fromEcr(props.repositories[command]),
        description: 'Function created: ' + new Date().toISOString(),
        environment: {
          "ACCESS_TOKEN_SECRET": secret.secretArn
        },
      });

      secret.grantRead(func)

      const alias = new Alias(this, capitalize(command) + 'Alias', {
        version: func.latestVersion,
        aliasName: 'prod'
      })

      new LambdaDeploymentGroup(this, capitalize(command) + 'DeploymentGroup', {
        alias: alias,
      });

      this.functions[command] = func;
    }
  }
}
