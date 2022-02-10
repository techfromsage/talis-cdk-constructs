import { CfnStage } from "@aws-cdk/aws-apigatewayv2";
import { IConstruct, CfnResource, Annotations } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class Apigatewayv2CfnStagePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (
      !(
        (node as CfnResource).cfnResourceType ===
        CfnStage.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      Annotations.of(node).addError(
        "Node is not a CfnStage and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public prefix(): void {}
}
