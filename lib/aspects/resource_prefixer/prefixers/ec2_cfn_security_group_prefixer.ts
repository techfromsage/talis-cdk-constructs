import { CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class Ec2CfnSecurityPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnSecurityGroup)) {
      throw new Error(
        "Specified node is not an instance of CfnSecurityGroup and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const securityGroup = this.node as CfnSecurityGroup;
    this.prefixResourceName(securityGroup.groupName, "GroupName");
  }
}
