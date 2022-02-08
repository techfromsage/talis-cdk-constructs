import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { LambdaCfnFunctionPrefixer } from "../../../../lib";
import { CfnSecurityGroupProperties } from "../../../fixtures/infra/aws-lambda/cfn_function";
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
      CfnSecurityGroupProperties
    );
    prefixer = new LambdaCfnFunctionPrefixer(cfnFunction, "test-prefix-");
    emptyPrefixer = new LambdaCfnFunctionPrefixer(cfnFunction, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps function name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::Lambda::Function", {
          functionName: "functionName",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the function name", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::Lambda::Function", {
          functionName: "test-prefix-functionName",
        })
      );
    });
  });

  describe("Undefined Resource", () => {
    test("Raises error if no prefixer defined for resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });

      expect(() => {
        new LambdaCfnFunctionPrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnFunction and cannot be prefixed using this prefixer"
      );
    });
  });
});
