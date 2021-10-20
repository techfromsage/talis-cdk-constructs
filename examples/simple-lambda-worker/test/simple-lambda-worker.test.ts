import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as SimpleLambdaWorker from "../lib/simple-lambda-worker-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new SimpleLambdaWorker.SimpleLambdaWorkerStack(
    app,
    "MyTestStack"
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
