import { CfnResource, IConstruct } from "@aws-cdk/core";

export interface CfnResourcePrefixer {
  prefix(): void;
}

export interface CfnResourcePrefixerConstructor {
  new (node: IConstruct, resourcePrefix: string): CfnResourcePrefixer;
}

export abstract class CfnResourcePrefixerBase implements CfnResourcePrefixer {
  protected node: CfnResource;
  protected resourcePrefix: string;

  constructor(node: CfnResource, resourcePrefix: string) {
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  protected prefixResourceName(
    name: string | undefined,
    propertyPath: string
  ): void {
    console.log(`name: ${name}`);
    console.log(`logicalId: ${this.node.logicalId}`);
    if (name) {
      this.node.addPropertyOverride(
        propertyPath,
        `${this.resourcePrefix}${name}`
      );
    } else {
      this.node.addPropertyOverride(
        propertyPath,
        `${this.resourcePrefix}${this.node.logicalId}`
      );
    }
  }

  public prefix() {
    throw new Error("Not implemented");
  }
}
