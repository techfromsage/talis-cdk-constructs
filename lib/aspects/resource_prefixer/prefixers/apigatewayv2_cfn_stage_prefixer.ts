import { CfnStage } from "@aws-cdk/aws-apigatewayv2";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class Apigatewayv2CfnStagePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnStage)) {
      throw new Error(
        "Specified node is not an instance of CfnStage and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public prefix(): void {}
}
