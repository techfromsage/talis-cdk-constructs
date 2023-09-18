import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaWorker extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const queue = new sqs.Queue(this, 'ProjectQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });
  }
}
