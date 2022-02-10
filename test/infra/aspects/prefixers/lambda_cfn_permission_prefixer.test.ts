import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import {LambdaCfnPermissionPrefixer} from "../../../../lib";
import { CfnPermissionProperties } from "../../../fixtures/infra/aws-lambda/cfn_permission";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Lambda CfnFunction Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnPermission: lambda.CfnPermission;
  let prefixer: LambdaCfnPermissionPrefixer;
  let emptyPrefixer: LambdaCfnPermissionPrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnPermission = new lambda.CfnPermission(
      stack,
      "function2",
      CfnPermissionProperties
    );
    prefixer = new LambdaCfnPermissionPrefixer(cfnPermission, "test-prefix-");
    emptyPrefixer = new LambdaCfnPermissionPrefixer(cfnPermission, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps permission name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::Lambda::Permission", {
          FunctionName: "functionName",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the permission name", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::Lambda::Permission", {
          FunctionName: "test-prefix-functionName",
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
        new LambdaCfnPermissionPrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnPermission and cannot be prefixed using this prefixer"
      );
    });
  });
});
