import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {HttpApi} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {IFunction} from "aws-cdk-lib/aws-lambda";

export interface ApiStackProps extends StackProps {
  authFunction: IFunction
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const authorizer = new HttpLambdaAuthorizer('DefaultAuthorizer', prop.authFunction, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    const api = new HttpApi(this, 'HttpApi', {
      defaultAuthorizer: authorizer
    });
  }
}
