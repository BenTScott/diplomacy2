import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as path from "path";
import {DockerImageCode, DockerImageFunction, IFunction} from "aws-cdk-lib/aws-lambda";

export class AuthStack extends Stack {
  function: IFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.function = new DockerImageFunction(this, 'AuthFunction', {
      code: DockerImageCode.fromImageAsset(path.join(__dirname, '../../'), {
        file: 'cmd/lambda/Dockerfile'
      }),
    });
  }
}
