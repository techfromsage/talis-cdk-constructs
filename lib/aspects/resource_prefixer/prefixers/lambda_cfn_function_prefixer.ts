import * as cdk from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class LambdaCfnFunctionPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (
      !(
        (node as cdk.CfnResource).cfnResourceType ===
        lambda.CfnFunction.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      cdk.Annotations.of(node).addError(
        "Node is not a CfnFunction and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const lambda = this.node as lambda.CfnFunction;
    this.prefixResourceName(lambda.functionName, "FunctionName");
  }
}
