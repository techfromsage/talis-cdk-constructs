import {
  expect as expectCDK,
  countResources,
  haveResourceLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";
import { LambdaWorker } from "../../lib/lambda-worker";

describe("LambdaWorker", () => {
  describe("with only required props", () => {
    let stack: cdk.Stack;
    let worker: LambdaWorker;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      worker = new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          policyStatements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sqs:*'],
              resources: ['*'],
            }),
          ],
          timeout: cdk.Duration.minutes(5),
          vpc: vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
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

    test.skip("exposes the sqs queue url and arn", () => {
      // This test does not work. In this test suite the construct has been created,
      // but the value of these properties are Tokens. e.g. "${Token[TOKEN.266]}"
      // See: https://github.com/aws/aws-cdk/issues/7258
      // And the reply it links to here: https://github.com/aws/aws-cdk/issues/7079#issuecomment-606394303
      // The tokens are not resolved into URL's until the `prepare` phase
      // This has not happened due to the way we are unit testing the constructs here.
      // We have a ticket to add integration tests for these constructs:
      // https://github.com/talis/platform/issues/5204
      // These will be tested in those integration tests.
      expect(worker.lambdaQueueUrl).toBe('expected url');
      expect(worker.lambdaQueueArn).toBe('expected arn');
    });

    test("provisions SQS queue and dead letter queue", () => {
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

    test("provisions a message visible alarm on the dead letter queue", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "MyTestLambdaWorker-dlq-messages-visible-alarm",
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

    test("provisions a message visible alarm on the main queue", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "MyTestLambdaWorker-queue-messages-visible-alarm",
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

      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          timeout: cdk.Duration.minutes(5),
          vpc: vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },

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

      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      new LambdaWorker(stack, "MyTestLambdaWorker", {
        name: "MyTestLambdaWorker",
        lambdaProps: {
          entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
          handler: "testWorker",
          memorySize: 2048,
          timeout: cdk.Duration.minutes(5),
          vpc: vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
        },
        queueProps: {},
        alarmTopic: alarmTopic,
        subscription: {
          topic: topic,
        },
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

  describe("when the lambda timeout is shorter than the minimum ", () => {
    test("throws an exception", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      expect(() => {
        new LambdaWorker(stack, "MyTestLambdaWorker", {
          name: "MyTestLambdaWorker",
          lambdaProps: {
            entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
            handler: "testWorker",
            memorySize: 2048,
            timeout: cdk.Duration.seconds(5),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
          },
          queueProps: {},
          alarmTopic: alarmTopic,
        });
      }).toThrow("Invalid lambdaProps.timeout value of 5. Minimum value is 30");
    });
  });

  describe("when memory size is smaller than the minimum ", () => {
    test("throws an exception", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      expect(() => {
        new LambdaWorker(stack, "MyTestLambdaWorker", {
          name: "MyTestLambdaWorker",
          lambdaProps: {
            entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
            handler: "testWorker",
            memorySize: 512,
            timeout: cdk.Duration.minutes(5),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
          },
          queueProps: {},
          alarmTopic: alarmTopic,
        });
      }).toThrow(
        "Invalid lambdaProps.memorySize value of 512. Minimum value is 1024"
      );
    });
  });
});
