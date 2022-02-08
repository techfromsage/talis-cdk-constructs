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
    if (name) {
      this.node.addPropertyOverride(
        propertyPath,
        `${this.resourcePrefix}${name}`
      );
    } else {
      const logicalId = this.node.stack.getLogicalId(this.node);
      this.node.addPropertyOverride(
        propertyPath,
        `${this.resourcePrefix}${logicalId}`
      );
    }
  }

  public prefix() {
    throw new Error("Not implemented");
  }
}
