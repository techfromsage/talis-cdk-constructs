import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";

export interface LambdaWorkerProps {
  // The name of the LambdaWorker
  name: string;

  // Lambda Properties
  // Documented here https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-nodejs.NodejsFunctionProps.html
  lambdaProps: {
    description?: string;
    dockerImageTag?: string;
    ecrRepositoryArn?: string;
    ecrRepositoryName?: string;
    handler?: string;
    entry?: string;
    environment?: { [key: string]: string };
    memorySize: number; // LambdaWorker will set a minimum memory size of 1024
    policyStatements?: iam.PolicyStatement[];
    reservedConcurrentExecutions?: number;
    retryAttempts?: number;
    securityGroup?: ec2.ISecurityGroup;
    timeout: cdk.Duration;
    vpc: ec2.IVpc;
    vpcSubnets: ec2.SubnetSelection;
  };

  // Queue Properties
  queueProps?: {
    // The maximum number of times a message is re-tried before
    // going to the DLQ. This will default to 5
    maxReceiveCount?: number;

    // The threshold for age of oldest message alarm
    // i.e. An alarm will be triggered when messages have not been processed
    // within this duration.
    // This will default to 1 hour.
    approximateAgeOfOldestMessageThreshold?: cdk.Duration;

    // The threshold for the alarm on the ApproximateNumberOfMessagesVisible metric
    // i.e. An alarm will be triggered if more than this number of messages is on the queue
    approximateNumberOfMessagesVisibleThreshold?: number;
  };

  // SNS Topic all alarm actions should be sent to
  alarmTopic: sns.ITopic;

  // Optional subscribe to SNS topic options
  subscription?: {
    // Optionally specify a topic to subscribe the lambda's SQS queue to.
    topic?: sns.Topic;

    filterPolicy?: { [key: string]: sns.SubscriptionFilter };
  };
}
