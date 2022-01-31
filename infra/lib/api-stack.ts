import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
  HttpApi,
  HttpAuthorizer,
  HttpMethod,
  HttpNoneAuthorizer,
  IHttpRouteAuthorizer
} from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpLambdaAuthorizer, HttpLambdaResponseType} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import {Function} from "aws-cdk-lib/aws-lambda";
import {HttpLambdaIntegration} from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {CfnStage} from "aws-cdk-lib/aws-apigatewayv2";
import {LogGroup} from "aws-cdk-lib/aws-logs";

export interface ApiStackProps extends StackProps {
  functions: { [command: string]: Function };
}

export class ApiStack extends Stack {
  private props: ApiStackProps;
  private authorizer: IHttpRouteAuthorizer;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.props = props;

    this.authorizer = new HttpLambdaAuthorizer('DefaultAuthorizer', props.functions['auth'], {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    const api = new HttpApi(this, 'DiplomacyApi',);

    this.addRoute(api, true, [HttpMethod.GET], 'user')
    this.addRoute(api, false, [HttpMethod.POST], 'login')

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

  addRoute(api: HttpApi, restricted: boolean, methods: HttpMethod[], command: string) {
    const func = this.props.functions[command];
    const integration = new HttpLambdaIntegration(func.node.id + 'Integration', func)

    api.addRoutes({
      methods,
      path: `/${command}`,
      integration,
      authorizer: restricted ? this.authorizer : undefined,
    })
  }
}