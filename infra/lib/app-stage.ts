import {Stage, StageProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {ApiStack} from "./api-stack";
import {AuthStack} from "./auth-stack";
import {LambdaStack} from "./lambda-stack";

export class AppStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const auth = new AuthStack(this, 'AuthStack');
    const user = new LambdaStack(this, 'UserStack', { command: 'user' });
    const game = new LambdaStack(this, 'GameStack', { command: 'game' });
    new ApiStack(this, 'ApiStack', { authFunction: auth.function, userFunction: user.function, gameFunction: game.function })
  }
}
