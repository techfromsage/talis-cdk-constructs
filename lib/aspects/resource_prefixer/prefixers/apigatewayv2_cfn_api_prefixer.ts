import { CfnApi } from "@aws-cdk/aws-apigatewayv2";
import { IConstruct, CfnResource, Annotations } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class Apigatewayv2CfnApiPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (
      !((node as CfnResource).cfnResourceType === CfnApi.CFN_RESOURCE_TYPE_NAME)
    ) {
      Annotations.of(node).addError(
        "Node is not a CfnApi and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const api = this.node as CfnApi;
    this.prefixResourceName(api.name, "Name");
  }
}
