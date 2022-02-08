import { CfnRole } from "@aws-cdk/aws-iam";
import { IConstruct } from "@aws-cdk/core";
import { CfnResourcePrefixer } from "../cfn_resource_prefixer";

export class IamCfnRolePrefixer implements CfnResourcePrefixer {
  private node: CfnRole;
  private resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnRole)) {
      throw new Error(
        "Specified node is not an instance of CfnRole and cannot be prefixed using this prefixer"
      );
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  public prefix(): void {
    this.node.addPropertyOverride(
      "RoleName",
      `${this.resourcePrefix}${this.node.roleName}`
    );
  }
}
