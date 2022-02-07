import { CfnStage } from "@aws-cdk/aws-apigatewayv2";
import { IConstruct } from "@aws-cdk/core";
import { CfnResourcePrefixer } from "../cfn_resource_prefixer";

export class Apigatewayv2CfnStagePrefixer implements CfnResourcePrefixer {
  private node: CfnStage;
  private resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnStage)) {
      throw new Error(
        "Specified node is not an instance of CfnStage and cannot be prefixed using this prefixer"
      );
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public prefix(): void {}
}
