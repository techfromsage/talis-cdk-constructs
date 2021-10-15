import * as cdk from '@aws-cdk/core';
import * as eventSource from '@aws-cdk/aws-lambda-event-sources';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJs from '@aws-cdk/aws-lambda-nodejs';
import * as sqs from '@aws-cdk/aws-sqs';
import * as subs from '@aws-cdk/aws-sns-subscriptions';

import { LambdaWorkerProps } from "./lambda-worker-props";

const DEFAULT_MAX_RECEIVE_COUNT = 5;
const MINIMUM_MEMORY_SIZE = 1024;

export class LambdaWorker extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: LambdaWorkerProps) {
    super(scope, id);

    // Validate and set values to be used to create lambda
    const memorySize = props.lambdaProps.memorySize && props.lambdaProps.memorySize > MINIMUM_MEMORY_SIZE ? props.lambdaProps.memorySize : MINIMUM_MEMORY_SIZE;

    // Validate and set values to be used to create queues
    const maxReceiveCount = props.queueProps.maxReceiveCount ? props.queueProps.maxReceiveCount : DEFAULT_MAX_RECEIVE_COUNT;

    // Create both the main queue and the dead letter queue
    const lambdaDLQ = new sqs.Queue(
      this,
      `${props.name}-dlq`, { queueName: `${props.name}-dlq` }
    );
    const lambdaQueue = new sqs.Queue(
      this,
      `${props.name}-queue`,
      {
        queueName: `${props.name}-queue`,
        deadLetterQueue: { queue: lambdaDLQ, maxReceiveCount: maxReceiveCount },
      }
    );

    // If we have specified a topic, then subscribe
    // the main queue to the topic.
    if (props.topic) {
      props.topic.addSubscription(new subs.SqsSubscription(lambdaQueue));
    }

    // Create the lambda
    const lambdaWorker = new lambdaNodeJs.NodejsFunction(this, `${props.name}`, {
      functionName: `${props.name}`,

      // Pass through props from lambda props object
      entry: props.lambdaProps.entry,
      handler: props.lambdaProps.handler,
      description: props.lambdaProps.description,
      environment: props.lambdaProps.environment,
      reservedConcurrentExecutions: props.lambdaProps.reservedConcurrentExecutions,
      retryAttempts: props.lambdaProps.retryAtempts,
      role: props.lambdaProps.role,
      securityGroup: props.lambdaProps.securityGroup,
      timeout: props.lambdaProps.timeout,
      vpc: props.lambdaProps.vpc,
      vpcSubnets: props.lambdaProps.vpcSubnets,

      // Optional props which have been validated or set to a default
      memorySize: memorySize,

      // Enforce the following properties
      awsSdkConnectionReuse: true,
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    // Add main queue and DLQ as event sources to the lambda
    // By default, the main queue is enabled and the DLQ is disabled
    lambdaWorker.addEventSource(new eventSource.SqsEventSource(lambdaQueue, { enabled: true }));
    lambdaWorker.addEventSource(new eventSource.SqsEventSource(lambdaDLQ, { enabled: false }));
  }
}
