import * as cdk from "@aws-cdk/core";

import { TalisCdkStack, TalisCdkStackProps } from "../../../lib";

export class SimpleTalisCdkStack extends TalisCdkStack {
  constructor(scope: cdk.Construct, id: string, props: TalisCdkStackProps) {
    super(scope, id, props);
  }
}
