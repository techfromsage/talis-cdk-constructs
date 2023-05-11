import {
  expect as expectCDK,
  countResources,
  haveResourceLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";
import { LambdaWorker } from "../../../lib/lambda-worker";

describe("LambdaWorker", () => {
  describe("function lambda", () => {
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
                actions: ["sqs:*"],
                resources: ["*"],
              }),
            ],
            timeout: cdk.Duration.minutes(5),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
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
                LAMBDA_EXECUTION_TIMEOUT: "300",
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
        expect(worker.lambdaQueueUrl).toBe("expected url");
        expect(worker.lambdaQueueArn).toBe("expected arn");
      });

      test("provisions SQS queue and dead letter queue", () => {
        expectCDK(stack).to(countResources("AWS::SQS::Queue", 2));

        expectCDK(stack).to(
          haveResourceLike("AWS::SQS::Queue", {
            QueueName: "MyTestLambdaWorker-queue",
            VisibilityTimeout: 1500, // 5 (default max receive count) * 300 (lambda timeout)
            FifoQueue: false,
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
            FifoQueue: false,
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
                    "MyTestLambdaWorkerMyTestLambdaWorkerqueue01D6E79E",
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
            ephemeralStorageSize: cdk.Size.mebibytes(1024),
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
            EphemeralStorage: {
              Size: 1024,
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

    describe("disabling queue event source", () => {
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
            enableQueue: false,
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

      test("provisions a lambda with disabled source", () => {
        expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));
        expectCDK(stack).to(
          countResources("AWS::Lambda::EventSourceMapping", 2)
        );

        expectCDK(stack).to(
          haveResourceLike("AWS::Lambda::EventSourceMapping", {
            FunctionName: {
              Ref: "MyTestLambdaWorker107005A6",
            },
            Enabled: false,
            EventSourceArn: {
              "Fn::GetAtt": [
                "MyTestLambdaWorkerMyTestLambdaWorkerqueue01D6E79E",
                "Arn",
              ],
            },
          })
        );
      });
    });

    describe("enable queue event source defaults to true", () => {
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

      test("provisions a lambda with enabled source", () => {
        expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));
        expectCDK(stack).to(
          countResources("AWS::Lambda::EventSourceMapping", 2)
        );

        expectCDK(stack).to(
          haveResourceLike("AWS::Lambda::EventSourceMapping", {
            FunctionName: {
              Ref: "MyTestLambdaWorker107005A6",
            },
            Enabled: true,
            EventSourceArn: {
              "Fn::GetAtt": [
                "MyTestLambdaWorkerMyTestLambdaWorkerqueue01D6E79E",
                "Arn",
              ],
            },
          })
        );
      });
    });
  });

  describe("with fifo queue", () => {
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
              actions: ["sqs:*"],
              resources: ["*"],
            }),
          ],
          timeout: cdk.Duration.minutes(5),
          vpc: vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        },
        queueProps: {
          fifo: true,
          contentBasedDeduplication: true,
        },
        alarmTopic: alarmTopic,
      });
    });

    test("provisions fifo SQS queue and dead letter queue", () => {
      expectCDK(stack).to(countResources("AWS::SQS::Queue", 2));

      expectCDK(stack).to(
        haveResourceLike("AWS::SQS::Queue", {
          QueueName: "MyTestLambdaWorker-queue.fifo",
          VisibilityTimeout: 1500, // 5 (default max receive count) * 300 (lambda timeout)
          FifoQueue: true,
          ContentBasedDeduplication: true,
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
          QueueName: "MyTestLambdaWorker-dlq.fifo",
          VisibilityTimeout: 1500, // 5 (default max receive count) * 300 (lambda timeout)
          FifoQueue: true,
          // ContentBasedDeduplication: true, // not set on the dlq. If it fails - we don't want it de duplicated for some reason.
        })
      );
    });
  });

  describe("container lambda", () => {
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
            dockerImageTag: "test-lambda-12345",
            ecrRepositoryArn: "arn:aws:ecr:eu-west-1:012345678910:repository",
            ecrRepositoryName: "repository",
            dockerCommand: "./src/script",
            memorySize: 2048,
            policyStatements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["sqs:*"],
                resources: ["*"],
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
            ImageConfig: {
              Command: ["./src/script"],
            },
            MemorySize: 2048,
            Timeout: 300,
            Code: {
              ImageUri: {
                "Fn::Join": [
                  "",
                  [
                    "012345678910.dkr.ecr.eu-west-1.",
                    {
                      Ref: "AWS::URLSuffix",
                    },
                    `/repository:test-lambda-12345`,
                  ],
                ],
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
        expect(worker.lambdaQueueUrl).toBe("expected url");
        expect(worker.lambdaQueueArn).toBe("expected arn");
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
                    "MyTestLambdaWorkerMyTestLambdaWorkerqueue01D6E79E",
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

    describe("with no command specified", () => {
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
            dockerImageTag: "test-lambda-12345",
            ecrRepositoryArn: "arn:aws:ecr:eu-west-1:012345678910:repository",
            ecrRepositoryName: "repository",
            // dockerCommand: "./src/script", Intentionally removed
            memorySize: 2048,
            policyStatements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["sqs:*"],
                resources: ["*"],
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
            // Command removed. There doesn't seem to be a way to verify that properties do not exist.
            //
            // ImageConfig: {
            //   "Command": [
            //     "./src/script"
            //   ]
            // },
            MemorySize: 2048,
            Timeout: 300,
            Code: {
              ImageUri: {
                "Fn::Join": [
                  "",
                  [
                    "012345678910.dkr.ecr.eu-west-1.",
                    {
                      Ref: "AWS::URLSuffix",
                    },
                    `/repository:test-lambda-12345`,
                  ],
                ],
              },
            },
          })
        );
      });
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

  describe("when dockerImageTag/ecrRepositoryArn/ecrRepositoryName and handler/entry are specified", () => {
    const cases = [
      {
        description: "throws an exception when all are specified",
        dockerCommand: "./src/example",
        dockerImageTag: "test-image-12345",
        ecrRepositoryArn: "arn:aws:ecr:eu-west-1:012345678910:repository/test",
        ecrRepositoryName: "repository",
        handler: "testWorker",
        entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
      },
      {
        description: "throws an exception when none are specified",
        dockerCommand: undefined,
        dockerImageTag: undefined,
        ecrRepositoryArn: undefined,
        ecrRepositoryName: undefined,
        handler: undefined,
        entry: undefined,
      },
      {
        description: "throws an exception when only handler is specified",
        dockerCommand: undefined,
        dockerImageTag: undefined,
        ecrRepositoryArn: undefined,
        ecrRepositoryName: undefined,
        handler: "testWorker",
        entry: undefined,
      },
      {
        description: "throws an exception when only entry is specified",
        dockerCommand: undefined,
        dockerImageTag: undefined,
        ecrRepositoryArn: undefined,
        ecrRepositoryName: undefined,
        handler: undefined,
        entry: "examples/simple-lambda-worker/src/lambda/simple-worker.js",
      },
      {
        description:
          "throws an exception when only dockerImageTag is specified",
        dockerCommand: undefined,
        dockerImageTag: "test-lambda-12345",
        ecrRepositoryArn: undefined,
        ecrRepositoryName: undefined,
        handler: undefined,
        entry: undefined,
      },
      {
        description:
          "throws an exception when only ecrRepositoryArn is specified",
        dockerCommand: undefined,
        dockerImageTag: undefined,
        ecrRepositoryArn: "arn:aws:ecr:eu-west-1:012345678910:repository/test",
        handler: undefined,
        entry: undefined,
      },
      {
        description:
          "throws an exception when only ecrRepositoryName is specified",
        dockerCommand: undefined,
        dockerImageTag: undefined,
        ecrRepositoryArn: undefined,
        ecrRepositoryName: "repository",
        handler: undefined,
        entry: undefined,
      },
      {
        description: "throws an exception when only dockerCommand is specified",
        dockerCommand: "src/example",
        dockerImageTag: undefined,
        ecrRepositoryArn: undefined,
        ecrRepositoryName: undefined,
        handler: undefined,
        entry: undefined,
      },
    ];

    cases.forEach((config) => {
      test(config.description, () => {
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
              entry: config.entry,
              handler: config.handler,
              dockerCommand: config.dockerCommand,
              dockerImageTag: config.dockerImageTag,
              ecrRepositoryArn: config.ecrRepositoryArn,
              ecrRepositoryName: config.ecrRepositoryName,
              memorySize: 2048,
              timeout: cdk.Duration.minutes(5),
              vpc: vpc,
              vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
            },
            queueProps: {},
            alarmTopic: alarmTopic,
          });
        }).toThrow(
          "Invalid lambdaProps only dockerImageTag/ecrRepositoryArn/ecrRepositoryName or handler/entry can be specified."
        );
      });
    });
  });
});
