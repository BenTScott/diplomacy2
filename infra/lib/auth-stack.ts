import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {IRepository} from "aws-cdk-lib/aws-ecr";
import {DockerImageAsset} from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";

export class AuthStack extends Stack {
  repository: IRepository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const asset = new DockerImageAsset(this, 'AuthImage', {
      directory: path.join(__dirname, '../../'),
      file: 'cmd/lambda/Dockerfile'
    });

    this.repository = asset.repository;
  }
}
