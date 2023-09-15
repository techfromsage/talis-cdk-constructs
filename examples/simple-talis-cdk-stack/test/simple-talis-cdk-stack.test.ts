import * as cdk from "aws-cdk-lib";
import * as SimpleTalisCdkStack from "../lib/simple-talis-cdk-stack";
import { Template } from "aws-cdk-lib/assertions";

import { TalisDeploymentEnvironment } from "../../../lib";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SimpleTalisCdkStack.SimpleTalisCdkStack(
    app,
    "MyTestStack",
    {
      app: "test-app",
      release: "test-release",
      deploymentEnvironment: TalisDeploymentEnvironment.TEST,
    },
  );
  // THEN
  Template.fromStack(stack).templateMatches({});
});
