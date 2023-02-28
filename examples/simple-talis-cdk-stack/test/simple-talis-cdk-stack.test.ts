import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as SimpleTalisCdkStack from "../lib/simple-talis-cdk-stack";

import { TalisDeploymentEnvironment } from "../../../lib";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SimpleTalisCdkStack.SimpleTalisCdkStack(
    app,
    "MyTestStack",
    {
      app: 'test-app',
      release: 'test-release',
      deploymentEnvironment: TalisDeploymentEnvironment.TEST,
    }
  );
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
