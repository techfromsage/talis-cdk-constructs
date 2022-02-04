import { CfnApi } from "@aws-cdk/aws-apigatewayv2";
import { IConstruct } from "@aws-cdk/core";
import { CfnResourcePrefixer } from "../cfn_resource_prefixer";

export class Apigatewayv2CfnApiPrefixer implements CfnResourcePrefixer {
  private node: CfnApi;
  private resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnApi)) {
      throw new Error(
        "Specified node is not an instance of CfnApi and cannot be prefixed using this prefixer"
      );
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  public prefix(): void {
    this.node.addPropertyOverride(
      "Name",
      `${this.resourcePrefix}${this.node.name}`
    );
  }
}
