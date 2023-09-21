import * as cdk from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { aws_apigatewayv2 as apigatewayv2 } from "aws-cdk-lib";
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
      !(
        (node as cdk.CfnResource).cfnResourceType ===
        apigatewayv2.CfnApi.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      cdk.Annotations.of(node).addError(
        "Node is not a CfnApi and cannot be prefixed using this prefixer",
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const api = this.node as apigatewayv2.CfnApi;
    this.prefixResourceName(api.name, "Name");
  }
}
