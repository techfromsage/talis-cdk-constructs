import * as cdk from '@aws-cdk/core';
import { DockerImageAsset } from '@aws-cdk/aws-ecr-assets';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecrdeploy from 'cdk-ecr-deployment';
import * as path from 'path';
import { RemovalPolicy } from '@aws-cdk/core';

export class ContainerLambdaWorkerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use AWS_PREFIX to give all resources in this sample
    // a unique name. This is usually `development-xx` where xx are your initials.
    // If you do not set AWS_PREFIX, when you deploy this stack, it may conflict
    // with someone elses stack who has also not set AWS_PREFIX
    const prefix = process.env.AWS_PREFIX
      ? process.env.AWS_PREFIX
      : "development-xx-";

    const repo = new ecr.Repository(this, 'example-repo', {
      repositoryName: `${prefix}cdk-container-lambda`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const dockerImage = new DockerImageAsset(this, 'container-build', {
      directory: path.join(__dirname, '../container')
    });

    new ecrdeploy.ECRDeployment(this, 'cdk-container-lambda-example', {
      src: new ecrdeploy.DockerImageName(dockerImage.imageUri),
      dest: new ecrdeploy.DockerImageName(`${repo.repositoryUri}:example`)
    });
  }
}