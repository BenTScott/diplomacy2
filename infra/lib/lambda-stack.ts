import {RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {DockerImageCode, DockerImageFunction, IFunction} from "aws-cdk-lib/aws-lambda";
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";
import * as path from "path";

export interface LambdaStackProps extends StackProps {
  command: string
}

export class LambdaStack extends Stack {
  function: IFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const repo = new Repository(this, capitalize(props.command) + 'Repository', {
      lifecycleRules: [ { maxImageCount: 10 } ],
      removalPolicy: RemovalPolicy.DESTROY
    });

    this.function = new DockerImageFunction(this, capitalize(props.command) + 'Function', {
      code: DockerImageCode.fromEcr(repo),
    });

    //buildArgs: { "cmd": props.command }
  }
}
