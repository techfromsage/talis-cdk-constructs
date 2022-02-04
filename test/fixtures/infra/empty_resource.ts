import { Construct, CfnResource, CfnResourceProps } from "@aws-cdk/core";

export class EmptyResource extends CfnResource {
  constructor(scope: Construct, id: string, props: CfnResourceProps) {
    super(scope, id, props);
  }
}
