import { CfnRole } from "@aws-cdk/aws-iam";
import { IConstruct, CfnResource, Annotations } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class IamCfnRolePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (
      !(
        (node as CfnResource).cfnResourceType === CfnRole.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      Annotations.of(node).addError(
        "Node is not a CfnRole and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const role = this.node as CfnRole;
    this.prefixResourceName(role.roleName, "RoleName");
  }
}
