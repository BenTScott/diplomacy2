import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {DockerImageCode, DockerImageFunction, Function} from "aws-cdk-lib/aws-lambda";
import {Secret} from "aws-cdk-lib/aws-secretsmanager";
import {AttributeType, BillingMode, Table} from "aws-cdk-lib/aws-dynamodb";

export interface UserStackProps extends StackProps {
  repositories: { [command: string]: Repository };
}

export class UserStack extends Stack {
  functions: { [command: string]: Function };

  constructor(scope: Construct, id: string, props: UserStackProps) {
    super(scope, id, props);

    this.functions = {};

    const pk = {name: 'PK', type: AttributeType.STRING};
    const sk = {name: 'SK', type: AttributeType.STRING};

    const table = new Table(this, 'UserTable', {
      partitionKey: pk,
      sortKey: sk,
      billingMode: BillingMode.PAY_PER_REQUEST,
      tableName: 'DiplomacyUserTable'
    })

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: sk,
      sortKey: pk
    });

    const secret = new Secret(this, 'AccessTokenSecret')

    for (const command in props.repositories) {
      const func = new DockerImageFunction(this, capitalize(command) + 'Function', {
        code: DockerImageCode.fromEcr(props.repositories[command]),
        environment: {
          "ACCESS_TOKEN_SECRET": secret.secretArn,
          "TABLE_NAME": table.tableName
        },
      });

      table.grantReadWriteData(func);

      secret.grantRead(func)

      this.functions[command] = func;
    }
  }
}
