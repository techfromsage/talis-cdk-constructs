import * as iam from "@aws-cdk/aws-iam";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { IamCfnRolePrefixer } from "../../../../lib";
import { CfnRoleProperties } from "../../../fixtures/infra/aws-iam/cfn_role";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("IAM CfnRole Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnRole: iam.CfnRole;
  let prefixer: IamCfnRolePrefixer;
  let emptyPrefixer: IamCfnRolePrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnRole = new iam.CfnRole(stack, "role2", CfnRoleProperties);
    prefixer = new IamCfnRolePrefixer(cfnRole, "test-prefix-");
    emptyPrefixer = new IamCfnRolePrefixer(cfnRole, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps role name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::IAM::Role", {
          roleName: "roleName",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the role name", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::IAM::Role", {
          roleName: "test-prefix-roleName",
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
        new IamCfnRolePrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnRole and cannot be prefixed using this prefixer"
      );
    });
  });
});
