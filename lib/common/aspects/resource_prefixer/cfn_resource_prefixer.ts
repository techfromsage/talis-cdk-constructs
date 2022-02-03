import { IConstruct } from "@aws-cdk/core";

export interface CfnResourcePrefixer {
  prefix(): void;
}

export interface CfnResourcePrefixerConstructor {
  new (node: IConstruct, resourcePrefix: string): CfnResourcePrefixer;
}
