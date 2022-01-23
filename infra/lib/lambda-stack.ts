import {RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {IFunction} from "aws-cdk-lib/aws-lambda";
import {capitalize} from "./utils";
import {Repository} from "aws-cdk-lib/aws-ecr";

export interface LambdaStackProps extends StackProps {
  command: string
}

export class LambdaStack extends Stack {
  function: IFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    new Repository(this, capitalize(props.command) + 'Repository', {
      lifecycleRules: [ { maxImageCount: 10 } ],
      removalPolicy: RemovalPolicy.DESTROY
    });

    // this.function = new DockerImageFunction(this, capitalize(props.command) + 'Function', {
    //   code: DockerImageCode.fromImageAsset(path.join(__dirname, '../../'), {
    //     buildArgs: { "cmd": props.command }
    //   }),
    // });
  }
}
