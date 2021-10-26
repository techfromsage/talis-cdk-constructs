import {
  expect as expectCDK,
  countResources,
  haveResourceLike,
} from "@aws-cdk/assert";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import { LambdaWorker } from "../../lib/lambda-worker";
/* import { AuthenticatedApi } from "../../lib/authenticated-api"; */

describe("LambdaWorker", () => {
  describe("with only required props", () => {
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
  });
});
