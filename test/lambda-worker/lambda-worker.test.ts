import {
  expect as expectCDK,
  countResources,
  haveResourceLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import { LambdaWorker } from "../../lib/lambda-worker";

describe("LambdaWorker", () => {
  describe("with only required props", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          timeout: cdk.Duration.minutes(5),
        },
        queueProps: {},
        alarmTopic: alarmTopic,
      });
    });

    test("provisions a lambda", () => {
      expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "MyTestLambdaWorker",
          MemorySize: 2048,
          Timeout: 300,
          Handler: "index.testWorker",
          Runtime: "nodejs14.x",
          Environment: {
            Variables: {
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
        })
      );
    });

    test("provisions sqs queue and dead letter queue", () => {
      expectCDK(stack).to(countResources("AWS::SQS::Queue", 2));

      expectCDK(stack).to(
        haveResourceLike("AWS::SQS::Queue", {
          QueueName: "MyTestLambdaWorker-queue",
          VisibilityTimeout: 1500, // 5 (default max receive count) * 300 (lambda timeout)
          RedrivePolicy: {
            maxReceiveCount: 5,
            deadLetterTargetArn: {
              "Fn::GetAtt": [
                "MyTestLambdaWorkerMyTestLambdaWorkerdlq27BBFD95",
                "Arn",
              ],
            },
          },
        })
      );

      expectCDK(stack).to(
        haveResourceLike("AWS::SQS::Queue", {
          QueueName: "MyTestLambdaWorker-dlq",
          VisibilityTimeout: 1500, // 5 (default max receive count) * 300 (lambda timeout)
        })
      );
    });

    test("provisions three alarms", () => {
      expectCDK(stack).to(countResources("AWS::CloudWatch::Alarm", 3));
    });

    test("provisions a message visable alarm on the dead letter queue", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "MyTestLambdaWorker-dlq-messages-visable-alarm",
          AlarmDescription:
            "Alarm when the lambda worker fails to process a message and the message appears on the DLQ",
          Namespace: "AWS/SQS",
          MetricName: "ApproximateNumberOfMessagesVisible",
          Dimensions: [
            {
              Name: "QueueName",
              Value: {
                "Fn::GetAtt": [
                  "MyTestLambdaWorkerMyTestLambdaWorkerdlq27BBFD95",
                  "QueueName",
                ],
              },
            },
          ],
          Period: 60,
          Statistic: "Sum",
          Threshold: 1,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });

    test("provisions a message visable alarm on the main queue", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "MyTestLambdaWorker-queue-messages-visable-alarm",
          AlarmDescription:
            "Alarm when the lambda workers main trigger queue has more than 1000 messages on the queue",
          Namespace: "AWS/SQS",
          MetricName: "ApproximateNumberOfMessagesVisible",
          Dimensions: [
            {
              Name: "QueueName",
              Value: {
                "Fn::GetAtt": [
                  "MyTestLambdaWorkerMyTestLambdaWorkerdlq27BBFD95",
                  "QueueName",
                ],
              },
            },
          ],
          Period: 60,
          Statistic: "Sum",
          Threshold: 1000,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });

    test("provisions an age of oldest message alarm on the main queue", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "MyTestLambdaWorker-queue-message-age-alarm",
          AlarmDescription:
            "Alarm when the lambda workers main trigger queue has messages older than 3600 seconds",
          Namespace: "AWS/SQS",
          MetricName: "ApproximateAgeOfOldestMessage",
          Dimensions: [
            {
              Name: "QueueName",
              Value: {
                "Fn::GetAtt": [
                  "MyTestLambdaWorkerMyTestLambdaWorkerdlq27BBFD95",
                  "QueueName",
                ],
              },
            },
          ],
          Period: 60,
          Statistic: "Average",
          Threshold: 3600,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });
  });

  describe("with optional props", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          timeout: cdk.Duration.minutes(5),

          // Optional
          description: "Test Description",
          environment: {
            TALIS_ENV_VAR: "some value",
          },
          reservedConcurrentExecutions: 10,
        },
        queueProps: {},
        alarmTopic: alarmTopic,
      });
    });

    test("provisions a lambda", () => {
      expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "MyTestLambdaWorker",
          MemorySize: 2048,
          Timeout: 300,
          Handler: "index.testWorker",
          Runtime: "nodejs14.x",
          //Optional
          Description: "Test Description",
          Environment: {
            Variables: {
              TALIS_ENV_VAR: "some value",
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
          ReservedConcurrentExecutions: 10,
        })
      );
    });
  });

  describe("given an optional topic", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });
      const topic = new sns.Topic(stack, "TestTopic", {
        topicName: "TestTopic",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          timeout: cdk.Duration.minutes(5),
        },
        queueProps: {},
        alarmTopic: alarmTopic,
        topic: topic,
      });
    });

    test("subscribes to the topic", () => {
      expectCDK(stack).to(countResources("AWS::SNS::Subscription", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::SNS::Subscription", {
          Protocol: "sqs",
          TopicArn: {
            Ref: "TestTopic339EC197",
          },
          Endpoint: {
            "Fn::GetAtt": [
              "MyTestLambdaWorkerMyTestLambdaWorkerqueue01D6E79E",
              "Arn",
            ],
          },
        })
      );
    });
  });

  describe("with a lambda timeout shorter than the minimum ", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          timeout: cdk.Duration.seconds(5),
        },
        queueProps: {},
        alarmTopic: alarmTopic,
      });
    });

    test("creates a lambda worker with the minimum timeout", () => {
      expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "MyTestLambdaWorker",
          MemorySize: 2048,
          Timeout: 30,
          Handler: "index.testWorker",
          Runtime: "nodejs14.x",
          Environment: {
            Variables: {
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
        })
      );
    });
  });

  describe("with a memory size smaller than the minimum ", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 512,
          timeout: cdk.Duration.minutes(5),
        },
        queueProps: {},
        alarmTopic: alarmTopic,
      });
    });

    test("creates a lambda worker with the minimum memory size", () => {
      expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "MyTestLambdaWorker",
          MemorySize: 1024,
          Timeout: 300,
          Handler: "index.testWorker",
          Runtime: "nodejs14.x",
          Environment: {
            Variables: {
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
        })
      );
    });
  });
});
