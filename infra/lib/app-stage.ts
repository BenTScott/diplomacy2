import {Stage, StageProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {ApiStack} from "./api-stack";
import {AuthStack} from "./auth-stack";

export class AppStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const auth = new AuthStack(this, 'AuthStack');
    new ApiStack(this, 'ApiStack', { authLambdaRepo: auth.repository })
  }
}
