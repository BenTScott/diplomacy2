import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {HttpApi, HttpIntegration, HttpMethod} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {IFunction} from "aws-cdk-lib/aws-lambda";
import {HttpUrlIntegration} from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export interface ApiStackProps extends StackProps {
  authFunction: IFunction
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const authorizer = new HttpLambdaAuthorizer('DefaultAuthorizer', props.authFunction, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    const api = new HttpApi(this, 'DiplomacyApi', {
      defaultAuthorizer: authorizer
    });

    const testIntegration = new HttpUrlIntegration('TestIntegration', "https://www.google.com/")

    api.addRoutes({
      methods: [ HttpMethod.ANY ],
      path: "/hello_world",
      integration: testIntegration
    })
  }
}
