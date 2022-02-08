import { CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import { IConstruct } from "@aws-cdk/core";
import { CfnResourcePrefixer } from "../cfn_resource_prefixer";

export class Ec2CfnSecurityPrefixer implements CfnResourcePrefixer {
  private node: CfnSecurityGroup;
  private resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnSecurityGroup)) {
      throw new Error(
        "Specified node is not an instance of CfnSecurityGroup and cannot be prefixed using this prefixer"
      );
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  public prefix(): void {
    this.node.addPropertyOverride(
      "groupName",
      `${this.resourcePrefix}${this.node.groupName}`
    );
  }
}
