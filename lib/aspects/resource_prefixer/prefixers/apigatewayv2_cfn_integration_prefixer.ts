import { CfnIntegration } from "@aws-cdk/aws-apigatewayv2";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class Apigatewayv2CfnIntegrationPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnIntegration)) {
      throw new Error(
        "Specified node is not an instance of CfnIntegration and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public prefix(): void {}
}
