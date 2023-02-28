import * as cdk from "@aws-cdk/core";
import * as sns from "@aws-cdk/aws-sns";
import {
  TalisDeploymentEnvironment,
  TalisCdkStack,
  TalisCdkStackProps,
} from "../../../lib";
import {
  expect as expectCDK,
  countResources,
  haveResourceLike,
} from "@aws-cdk/assert";


describe("Talis CDK Stack", () => {
  let stack: TalisCdkStack;
  let app: cdk.App;
  let props: TalisCdkStackProps;

  describe("Default environment removal policies", () => {
    beforeEach(() => {
      app = new cdk.App();
      props = 
        { deploymentEnvironment: TalisDeploymentEnvironment.TEST,       
          app: 'test-depot',
          release: 'test1-105814f' 
      };
      stack = new TalisCdkStack(app, "test-stack", props);
    });

    test.each([
      [TalisDeploymentEnvironment.BUILD, cdk.RemovalPolicy.DESTROY],
      [TalisDeploymentEnvironment.DEVELOPMENT, cdk.RemovalPolicy.DESTROY],
      [TalisDeploymentEnvironment.TEST, cdk.RemovalPolicy.DESTROY],
      [TalisDeploymentEnvironment.STAGING, cdk.RemovalPolicy.SNAPSHOT],
      [TalisDeploymentEnvironment.PRODUCTION, cdk.RemovalPolicy.RETAIN],
    ])(
      "Environment %s should have removal policy of %s",
      (environment, expected) => {
        expect(
          stack.getRemovalPolicyForTalisDeploymentEnvironment(environment)
        ).toBe(expected);
      }
    );
  });
  describe("Tags are applied to resources", () => {
    it("Should have the correct tags", () => {
      app = new cdk.App();
      stack = new TalisCdkStack(
        app,
        "TestStack",
        { deploymentEnvironment: TalisDeploymentEnvironment.TEST,
          app: 'test-depot',
          release: 'test1-105814f',
          env: {
            region: 'eu-west-1',
          }
        }
      );

      new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      expectCDK(stack).to(countResources("AWS::SNS::Topic", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::SNS::Topic", {
          "Tags": [
            {
              "Key": "tfs-app",
              "Value": "test-depot"
            },
            {
              "Key": "tfs-environment",
              "Value": "test"
            },
            {
              "Key": "tfs-region",
              "Value": "eu-west-1"
            },
            {
              "Key": "tfs-release",
              "Value": "test1-105814f"
            },
            {
              "Key": "tfs-service",
              "Value": "test-depot-eu"
            }
          ],
          "TopicName": "TestAlarm"
        })
      );
    });
    it("Should have correct tags when no environment", () => {
      app = new cdk.App();
      stack = new TalisCdkStack(
        app,
        "TestStack",
        { deploymentEnvironment: TalisDeploymentEnvironment.TEST,
          app: 'test-depot',
          release: 'test1-105814f',
        }
      );

      new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });

      expectCDK(stack).to(countResources("AWS::SNS::Topic", 1));

      expectCDK(stack).to(
        haveResourceLike("AWS::SNS::Topic", {
          "Tags": [
            {
              "Key": "tfs-app",
              "Value": "test-depot"
            },
            {
              "Key": "tfs-environment",
              "Value": "test"
            },
            {
              "Key": "tfs-release",
              "Value": "test1-105814f"
            },
          ],
          "TopicName": "TestAlarm"
        })
      );
    });
  });
});
