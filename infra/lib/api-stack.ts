import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {Function, IFunction} from "aws-cdk-lib/aws-lambda";
import {HttpLambdaIntegration, HttpUrlIntegration} from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {CfnStage} from "aws-cdk-lib/aws-apigatewayv2";
import {LogGroup} from "aws-cdk-lib/aws-logs";

export interface ApiStackProps extends StackProps {
  functions: { [command: string]: Function };
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const authorizer = new HttpLambdaAuthorizer('DefaultAuthorizer', props.functions['auth'], {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    const api = new HttpApi(this, 'DiplomacyApi', {
      defaultAuthorizer: authorizer,
    });

    const userIntegration = new HttpLambdaIntegration('UserIntegration', props.functions['user'])

    api.addRoutes({
      methods: [ HttpMethod.GET ],
      path: "/user",
      integration: userIntegration,
      authorizer
    });

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
