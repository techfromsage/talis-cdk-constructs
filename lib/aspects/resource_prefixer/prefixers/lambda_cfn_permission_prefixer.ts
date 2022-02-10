import { CfnPermission } from "@aws-cdk/aws-lambda";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class LambdaCfnPermissionPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnPermission)) {
      throw new Error(
        "Specified node is not an instance of CfnPermission and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const lambda = this.node as CfnPermission;
    this.prefixResourceName(lambda.functionName, "FunctionName");
  }
}
