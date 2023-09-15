import * as cdk from "aws-cdk-lib";
import { IConstruct } from "constructs";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class EmptyCfnResourcePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct) {
    if (!cdk.CfnResource.isCfnResource(node)) {
      cdk.Annotations.of(node).addError(
        "Node is not a CfnResource and cannot be prefixed using this prefixer",
      );
    }
    super(node, "");
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public prefix(): void {}
}
