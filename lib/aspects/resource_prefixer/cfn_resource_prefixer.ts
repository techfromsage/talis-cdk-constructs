import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

export interface CfnResourcePrefixer {
  prefix(): void;
}

export interface CfnResourcePrefixerConstructor {
  new (node: IConstruct, resourcePrefix: string): CfnResourcePrefixer;
}

export abstract class CfnResourcePrefixerBase implements CfnResourcePrefixer {
  protected node: cdk.CfnResource;
  protected resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!cdk.CfnResource.isCfnResource(node)) {
      throw new Error("Node is not a CfnResource");
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  protected prefixResourceName(
    name: string | undefined,
    propertyPath: string
  ): void {
    if (!cdk.Token.isUnresolved(name)) {
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
