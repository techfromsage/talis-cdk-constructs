import * as cdk from "@aws-cdk/core";
import {
  TalisDeploymentEnvironment,
  TalisCdkStack,
  TalisCdkStackProps,
} from "../../../lib";
describe("Talis CDK Stack", () => {
  let stack: TalisCdkStack;
  let app: cdk.App;
  let props: TalisCdkStackProps;

  beforeEach(() => {
    app = new cdk.App();
    props = { deploymentEnvironment: TalisDeploymentEnvironment.TEST };
    stack = new TalisCdkStack(app, "test-stack", props);
  });
  describe("Default environment removal policies", () => {
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
});
