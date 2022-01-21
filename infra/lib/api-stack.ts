import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {IFunction} from "aws-cdk-lib/aws-lambda";
import {HttpLambdaIntegration, HttpUrlIntegration} from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {CfnStage} from "aws-cdk-lib/aws-apigatewayv2";
import {LogGroup} from "aws-cdk-lib/aws-logs";

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
      defaultAuthorizer: authorizer,
    });

    const testIntegration = new HttpLambdaIntegration('TestIntegration', props.authFunction)

    const routes = api.addRoutes({
      methods: [ HttpMethod.ANY ],
      path: "/hello_world",
      integration: testIntegration,
      authorizer
    })

    authorizer.bind({
      scope: this,
      route: routes[0],
    })

    testIntegration.bind({
      scope:this,
      route: routes[0]
    })

    const accessLogs = new LogGroup(this, 'DiplomacyApi-AccessLogs')
    const stage = api.defaultStage?.node.defaultChild as CfnStage
    stage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        requestTimeEpoch: '$context.requestTimeEpoch',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
        domainName: '$context.domainName',
        integrationError: '$context.integrationErrorMessage'
      })};
  }
}
