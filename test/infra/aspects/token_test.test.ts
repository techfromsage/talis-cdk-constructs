import * as cdk from "@aws-cdk/core";

import {
  expect as expectCDK,
  haveResource,
  haveResourceLike,
} from "@aws-cdk/assert";
import { Match, Template } from "@aws-cdk/assertions";
import { ResourcePrefixer } from "../../../lib";
import { Aspects } from "@aws-cdk/core";
import { EmptyResource } from "../../fixtures/infra/empty_resource";
import { ResourcePrefixerTestCases } from "../../fixtures/infra/resource_prefixer_test_cases";
import * as lambda from "@aws-cdk/aws-lambda";

describe("Resource Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let resourcePrefixer: ResourcePrefixer;
  let emptyResourcePrefixer: ResourcePrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    resourcePrefixer = new ResourcePrefixer("test-prefix-");
    emptyResourcePrefixer = new ResourcePrefixer("");
  });

  test("Adds prefix to auto-generated name", () => {
    new lambda.Function(stack, "lambda", {
      functionName: "function-name",
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`exports.handler = handler.toString()`),
    });
    Aspects.of(stack).add(resourcePrefixer);
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: Match.stringLikeRegexp("test-prefix-"),
    });
  });
});
