import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { Annotations } from "@aws-cdk/assertions";
import { LambdaCfnFunctionPrefixer } from "../../../../lib";
import { CfnFunctionProperties } from "../../../fixtures/infra/aws-lambda/cfn_function";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Lambda CfnFunction Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnFunction: lambda.CfnFunction;
  let prefixer: LambdaCfnFunctionPrefixer;
  let emptyPrefixer: LambdaCfnFunctionPrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnFunction = new lambda.CfnFunction(
      stack,
      "function2",
      CfnFunctionProperties
    );
    prefixer = new LambdaCfnFunctionPrefixer(cfnFunction, "test-prefix-");
    emptyPrefixer = new LambdaCfnFunctionPrefixer(cfnFunction, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps function name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::Lambda::Function", {
          FunctionName: "functionName",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the function name", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::Lambda::Function", {
          FunctionName: "test-prefix-functionName",
        })
      );
    });
  });

  describe("Undefined Resource", () => {
    test("Adds error annotation if prefixer cannot be used for cloud formation resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });
      new LambdaCfnFunctionPrefixer(unknownResource, "prefix");
      Annotations.fromStack(stack).hasError(
        "/AspectTestStack/empty",
        "Node is not a CfnFunction and cannot be prefixed using this prefixer"
      );
    });
  });
});
