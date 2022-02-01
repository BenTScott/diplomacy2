import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {Alias, DockerImageCode, DockerImageFunction, Function} from "aws-cdk-lib/aws-lambda";
import {Secret} from "aws-cdk-lib/aws-secretsmanager";
import {LambdaApplication, LambdaDeploymentGroup} from "aws-cdk-lib/aws-codedeploy";

export interface LambdaStackProps extends StackProps {
  repositories: { [command: string]: Repository };
}

export class LambdaStack extends Stack {
  functions: { [command: string]: Function };

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    this.functions = {};

    const secret = new Secret(this, 'AccessTokenSecret')

    const lambdaApp = new LambdaApplication(this, 'LambdaApp')

    for (const command in props.repositories) {
      const func = new DockerImageFunction(this, capitalize(command) + 'Function', {
        code: DockerImageCode.fromEcr(props.repositories[command]),
        description: 'Function created: ' + new Date().toISOString(),
        environment: {
          "ACCESS_TOKEN_SECRET": secret.secretArn
        },
      });

      secret.grantRead(func)

      const alias = func.latestVersion.addAlias('prod')

       new LambdaDeploymentGroup(this, capitalize(command) + 'DeploymentGroup', {
        alias: alias,
        application: lambdaApp
      });

      this.functions[command] = func;
    }
  }
}
