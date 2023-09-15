import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { Annotations, Template } from "aws-cdk-lib/assertions";

import { Ec2CfnSecurityGroupPrefixer } from "../../../../lib";
import { CfnSecurityGroupProperties } from "../../../fixtures/infra/aws-ec2/cfn_security_group";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Lambda CfnSecurityGroup Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnSecurityGroup: ec2.CfnSecurityGroup;
  let prefixer: Ec2CfnSecurityGroupPrefixer;
  let emptyPrefixer: Ec2CfnSecurityGroupPrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnSecurityGroup = new ec2.CfnSecurityGroup(
      stack,
      "securityGroup2",
      CfnSecurityGroupProperties,
    );
    prefixer = new Ec2CfnSecurityGroupPrefixer(
      cfnSecurityGroup,
      "test-prefix-",
    );
    emptyPrefixer = new Ec2CfnSecurityGroupPrefixer(cfnSecurityGroup, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps group name the same", () => {
      emptyPrefixer.prefix();

      Template.fromStack(stack).hasResourceProperties(
        "AWS::EC2::SecurityGroup",
        {
          GroupName: "groupName",
        },
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the group name", () => {
      prefixer.prefix();

      Template.fromStack(stack).hasResourceProperties(
        "AWS::EC2::SecurityGroup",
        {
          GroupName: "test-prefix-groupName",
        },
      );
    });
  });

  describe("Undefined Resource", () => {
    test("Adds error annotation if prefixer cannot be used for cloud formation resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });
      new Ec2CfnSecurityGroupPrefixer(unknownResource, "prefix");
      Annotations.fromStack(stack).hasError(
        "/AspectTestStack/empty",
        "Node is not a CfnSecurityGroup and cannot be prefixed using this prefixer",
      );
    });
  });
});
