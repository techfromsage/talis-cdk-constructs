import * as cdk from "@aws-cdk/core";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TalisCdkConstructsProps {
  // Define construct properties here
}

export class TalisCdkConstructs extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: TalisCdkConstructsProps = {}
  ) {
    super(scope, id);

    // Define construct contents here
  }
}
