import { CfnRole } from "@aws-cdk/aws-iam";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class IamCfnRolePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnRole)) {
      throw new Error(
        "Specified node is not an instance of CfnRole and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const role = this.node as CfnRole;
    this.prefixResourceName(role.roleName, "RoleName");
  }
}
