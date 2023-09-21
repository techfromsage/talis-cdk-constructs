import * as cdk from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { IConstruct } from "constructs";

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
        (node as cdk.CfnResource).cfnResourceType ===
        iam.CfnRole.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      cdk.Annotations.of(node).addError(
        "Node is not a CfnRole and cannot be prefixed using this prefixer",
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const role = this.node as iam.CfnRole;
    this.prefixResourceName(role.roleName, "RoleName");
  }
}
