import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as path from "path";
import {DockerImageCode, DockerImageFunction, IFunction} from "aws-cdk-lib/aws-lambda";
import {DockerImageAsset} from "aws-cdk-lib/aws-ecr-assets";
import {capitalize} from "./utils";

export interface LambdaStackProps extends StackProps {
  command: string
}

export class LambdaStack extends Stack {
  function: IFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    this.function = new DockerImageFunction(this, capitalize(props.command) + 'Function', {
      code: DockerImageCode.fromImageAsset(path.join(__dirname, '../../'), {
        buildArgs: { "cmd": props.command }
      }),
    });
  }
}
