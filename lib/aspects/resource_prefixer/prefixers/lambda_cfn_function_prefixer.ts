import { CfnFunction } from "@aws-cdk/aws-lambda";
import { IConstruct } from "@aws-cdk/core";
import { CfnResourcePrefixer } from "../cfn_resource_prefixer";

export class LambdaCfnFunctionPrefixer implements CfnResourcePrefixer {
  private node: CfnFunction;
  private resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnFunction)) {
      throw new Error(
        "Specified node is not an instance of CfnFunction and cannot be prefixed using this prefixer"
      );
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  public prefix(): void {
    this.node.addPropertyOverride(
      "functionName",
      `${this.resourcePrefix}${this.node.functionName}`
    );
  }
}
