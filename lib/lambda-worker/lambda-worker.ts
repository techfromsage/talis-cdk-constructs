import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';

import { LambdaWorkerProps } from "./lambda-worker-props";

export class LambdaWorker extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: LambdaWorkerProps) {
    super(scope, id);

    // Create an SQS queue and subscribe it to the topic.
    const lambdaQueue = new sqs.Queue(scope, `${props.name}-queue`, { queueName: `${props.name}-queue` });
    /* props.topicListeningOn.addSubscription(new subs.SqsSubscription(lambdaQueue)); */
  }
}
