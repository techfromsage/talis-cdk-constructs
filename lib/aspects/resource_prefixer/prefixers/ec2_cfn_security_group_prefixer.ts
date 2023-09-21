import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class Ec2CfnSecurityGroupPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (
      !(
        (node as cdk.CfnResource).cfnResourceType ===
        ec2.CfnSecurityGroup.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      cdk.Annotations.of(node).addError(
        "Node is not a CfnSecurityGroup and cannot be prefixed using this prefixer",
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const securityGroup = this.node as ec2.CfnSecurityGroup;
    this.prefixResourceName(securityGroup.groupName, "GroupName");
  }
}
