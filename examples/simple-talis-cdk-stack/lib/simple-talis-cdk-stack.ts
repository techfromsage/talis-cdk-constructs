import { Construct } from "constructs";
import { TalisCdkStack, TalisCdkStackProps } from "../../../lib";

export class SimpleTalisCdkStack extends TalisCdkStack {
  constructor(scope: Construct, id: string, props: TalisCdkStackProps) {
    super(scope, id, props);
  }
}
