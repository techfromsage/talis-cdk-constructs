import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class EmptyResource extends cdk.CfnResource {
  constructor(scope: Construct, id: string, props: cdk.CfnResourceProps) {
    super(scope, id, props);
  }
}
