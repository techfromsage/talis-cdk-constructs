import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";

import { LambdaWorker } from "../../../lib";

export class SimpleLambdaWorkerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use AWS_PREFIX to give all resources in this sample
    // a unique name. This is usually `development-xx` where xx are your initials.
    // If you do not set AWS_PREFIX, when you deploy this stack, it may conflict
    // with someone elses stack who has also not set AWS_PREFIX
    const prefix = process.env.AWS_PREFIX
      ? process.env.AWS_PREFIX
      : "development-xx-";

    // The LambdaWorker will be triggered by a queue created in the construct.
    // Optionally, you can pass the LambdaWorker a pre-existing topic which
    // the queue will be subscribed to.
    //
    // This is useful when using Pub/Sub as depot-serverless does. A single
    // "File" topic is created which all workers subscribe to.
    const topic = new sns.Topic(this, `${prefix}SimpleLambdaWorker-topic`, {
      topicName: `${prefix}SimpleLambdaWorker-topic`,
    });

    // LambdaWorker requires an existing SNS topic to publish alarms to.
    // TODO : A real app would not create this topic which is already created by terraform.
    // Can we pull in this alarm which is defined in terraform as an example of how to do that
    const alarmTopic = new sns.Topic(
      this,
      `${prefix}SimpleLambdaWorker-alarm`,
      { topicName: `${prefix}SimpleLambdaWorker-alarm` }
    );

    // Create the Lambda
    /* const worker = */ new LambdaWorker(this, `${prefix}SimpleLambdaWorker`, {
      name: `${prefix}SimpleLambdaWorker`,
      lambdaProps: {
        environment: {
          EXAMPLE_ENV_VAR: "example value",
        },
        entry: "src/lambda/simple-worker.js",
        handler: "simpleLambdaWorker",
        memorySize: 1024,
        timeout: cdk.Duration.minutes(5),
      },
      queueProps: {
        maxReceiveCount: 3,
      },
      alarmTopic: alarmTopic,

      // Subscribing to a topic is optional
      subscription: {
        topic: topic,
        // Without a filterPolicy the subscription will receive all messages
        // An optional filterPolicy can be aplied so only specific messages are received
        // This example is a real example from Depot's Pub/Sub architecture where we want messages containing:
        // { action: "COMPLETED", output_type: "DOCUMENT", mime_type: "application/pdf"
        filterPolicy: {
          action: sns.SubscriptionFilter.stringFilter({
            allowlist: ["COMPLETED"],
          }),
          output_type: sns.SubscriptionFilter.stringFilter({
            allowlist: ["DOCUMENT"],
          }),
          mime_type: sns.SubscriptionFilter.stringFilter({
            allowlist: ["application/pdf"],
          }),
        },
      },
    });
  }
}
