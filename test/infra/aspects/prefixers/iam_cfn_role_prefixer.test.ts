import * as cdk from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";

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

      Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
        RoleName: "roleName",
      });
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the role name", () => {
      prefixer.prefix();

      Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
        RoleName: "test-prefix-roleName",
      });
    });

    test("Adds prefix to the start of logical id if no role name given", () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, "AspectTestStack", {});
      const cfnRole = new iam.CfnRole(stack, "roleOther", {
        assumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: ["ec2.amazonaws.com"],
              },
              Action: ["sts:AssumeRole"],
            },
          ],
        },
      });
      const prefixer = new IamCfnRolePrefixer(cfnRole, "test-prefix-");

      prefixer.prefix();

      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: Match.stringLikeRegexp("test-prefix-"),
      });
    });
  });

  describe("Undefined Resource", () => {
    test("Adds error annotation if prefixer cannot be used for cloud formation resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });
      new IamCfnRolePrefixer(unknownResource, "prefix");
      Annotations.fromStack(stack).hasError(
        "/AspectTestStack/empty",
        "Node is not a CfnRole and cannot be prefixed using this prefixer",
      );
    });
  });
});
