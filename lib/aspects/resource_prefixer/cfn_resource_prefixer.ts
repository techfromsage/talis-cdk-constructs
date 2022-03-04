import { IConstruct, CfnResource, Token } from "@aws-cdk/core";

const MAX_LENGTH = 64;

export interface CfnResourcePrefixer {
  prefix(): void;
}

export interface CfnResourcePrefixerConstructor {
  new (node: IConstruct, resourcePrefix: string): CfnResourcePrefixer;
}

export abstract class CfnResourcePrefixerBase implements CfnResourcePrefixer {
  protected node: CfnResource;
  protected resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!CfnResource.isCfnResource(node)) {
      throw new Error("Node is not a CfnResource");
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  protected prefixResourceName(
    name: string | undefined,
    propertyPath: string
  ): void {
    let prefixedName;
    if (!Token.isUnresolved(name)) {
      prefixedName = `${this.resourcePrefix}${name}`;
    } else {
      const logicalId = this.node.stack.getLogicalId(this.node);
      prefixedName = `${this.resourcePrefix}${logicalId}`;
    }

    this.node.addPropertyOverride(
      propertyPath,
      prefixedName.substring(0, MAX_LENGTH)
    );
  }

  public prefix() {
    throw new Error("Not implemented");
  }
}
