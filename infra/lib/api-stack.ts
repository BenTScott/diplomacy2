import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {HttpApi} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {DockerImageCode, DockerImageFunction} from "aws-cdk-lib/aws-lambda";
import {IRepository} from "aws-cdk-lib/aws-ecr";

export interface ApiStackProps extends StackProps {
  authLambdaRepo: IRepository
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const authHandler = new DockerImageFunction(this, 'AuthFunction', {
      code: DockerImageCode.fromEcr(props.authLambdaRepo),
    });

    const authorizer = new HttpLambdaAuthorizer('DefaultAuthorizer', authHandler, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    const api = new HttpApi(this, 'HttpApi', {
      defaultAuthorizer: authorizer
    });
  }
}
