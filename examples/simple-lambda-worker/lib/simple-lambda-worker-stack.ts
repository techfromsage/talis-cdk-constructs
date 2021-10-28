import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';

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
    const topic = new sns.Topic(this, `${prefix}simple-lambda-worker-topic`, {
      topicName: `${prefix}simple-lambda-worker-topic`,
    });

    // LambdaWorker requires an existing SNS topic to publish alarms to.
    // TODO : A real app would not create this topic which is already created by terraform.
    // Can we pull in this alarm which is defined in terraform as an example of how to do that
    const alarmTopic = new sns.Topic(
      this,
      `${prefix}simple-lambda-Worker-alarm`,
      { topicName: `${prefix}simple-lambda-worker-alarm` }
    );

    const vpc = ec2.Vpc.fromLookup(this, `${prefix}-vpc`, {
      vpcId: "vpc-0155db5e1ab5c28b6",
    });

    const s3Policy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:PutObjectAcl', 's3:ListBucket'],
          resources: ['arn:aws:s3:::development-mr-pdf-bucket/*'],
        })
      ]
    });

    const s3Role = new iam.Role(this, `${prefix}role`, {
      assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
      description: 'Role for lambda s3 access',
      inlinePolicies: {
        s3AccessRole: s3Policy
      }
    });

    s3Role.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('lambda.amazonaws.com')],
      }),
    );

    //Lambda Layer
    const wkHtmlToPdfLayer = new lambda.LayerVersion(this, `${prefix}-wk-html-to-pdf-layer`, {
      code: lambda.Code.fromAsset('lib/wkhtmltox-0.12.6-4.amazonlinux2_lambda.zip'),
      description: 'The wkhtmltopdf layer provided from https://wkhtmltopdf.org/downloads.html'
    })

    // Create the Lambda
    /* const worker = */ new LambdaWorker(
      this,
      `${prefix}simple-lambda-worker`,
      {
        name: `${prefix}simple-lambda-worker`,
        lambdaProps: {
          role: s3Role,
          environment: {
            EXAMPLE_ENV_VAR: "example value",
            FONTCONFIG_PATH: "/opt/fonts",
          },
          entry: "src/lambda/simple-worker.js",
          handler: "simpleLambdaWorker",
          layers: [wkHtmlToPdfLayer],
          memorySize: 1024,
          timeout: cdk.Duration.minutes(1),
          vpc: vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
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
      }
    );
  }
}
