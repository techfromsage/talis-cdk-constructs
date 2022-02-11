import { IConstruct, CfnResource, Annotations } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class EmptyCfnResourcePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct) {
    if (!CfnResource.isCfnResource(node)) {
      Annotations.of(node).addError(
        "Node is not a CfnResource and cannot be prefixed using this prefixer"
      );
    }
    super(node, "");
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public prefix(): void {}
}
