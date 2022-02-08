import { CfnFunction } from "@aws-cdk/aws-lambda";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";
import { Ec2CfnSecurityPrefixer } from "./ec2_cfn_security_group_prefixer";
import { CfnRole } from "@aws-cdk/aws-iam";

export class LambdaCfnFunctionPrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnFunction)) {
      throw new Error(
        "Specified node is not an instance of CfnFunction and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const lambda = this.node as CfnFunction;
    this.prefixResourceName(lambda.functionName, "FunctionName");
  }
}
