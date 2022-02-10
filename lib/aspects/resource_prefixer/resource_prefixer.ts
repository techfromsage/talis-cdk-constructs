import { CfnResource, Construct, IAspect, IConstruct } from "@aws-cdk/core";
import {
  Apigatewayv2CfnApiPrefixer,
  Apigatewayv2CfnStagePrefixer,
  DynamoDbCfnTablePrefixer,
  Ec2CfnSecurityGroupPrefixer,
  IamCfnRolePrefixer,
  LambdaCfnFunctionPrefixer,
} from "./prefixers";
import { CfnResourcePrefixer } from "./cfn_resource_prefixer";
import { CfnTable } from "@aws-cdk/aws-dynamodb";
import { CfnApi, CfnStage } from "@aws-cdk/aws-apigatewayv2";
import { CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import { CfnRole } from "@aws-cdk/aws-iam";
import { CfnFunction } from "@aws-cdk/aws-lambda";
import { Annotations } from "@aws-cdk/core";
import { EmptyCfnResourcePrefixer } from "./prefixers/empty_cfn_resource_prefixer";

export type Constructor<T> = { new (...args: any[]): T };

type CfnResourceConstructor = {
  new (...args: any[]): CfnResource;
  CFN_RESOURCE_TYPE_NAME: string;
};

export class ResourcePrefixer implements IAspect {
  private prefix: string;
  private prefixers: Map<
    CfnResourceConstructor,
    Constructor<CfnResourcePrefixer>[]
  >;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.prefixers = new Map<
      CfnResourceConstructor,
      Constructor<CfnResourcePrefixer>[]
    >();

    this.registerPrefixer(CfnTable, DynamoDbCfnTablePrefixer);
    this.registerPrefixer(CfnApi, Apigatewayv2CfnApiPrefixer);
    this.registerPrefixer(CfnStage, Apigatewayv2CfnStagePrefixer);
    this.registerPrefixer(CfnSecurityGroup, Ec2CfnSecurityGroupPrefixer);
    this.registerPrefixer(CfnRole, IamCfnRolePrefixer);
    this.registerPrefixer(CfnFunction, LambdaCfnFunctionPrefixer);
  }

  public visit(node: IConstruct): void {
    // We only care about Cloudformation Resources so skip anything that isnot one
    if (!CfnResource.isCfnResource(node)) {
      return;
    }

    for (const key of this.prefixers.keys()) {
      if (node.cfnResourceType === key.CFN_RESOURCE_TYPE_NAME) {
        this.prefixers.get(key)?.forEach((prefixer) => {
          new prefixer(node, this.prefix).prefix();
        });
        // Return after running prefixers for resource as only one resource should match
        return;
      }
    }

    Annotations.of(node).addWarning(
      `No defined resource prefixer for: ${node.cfnResourceType}`
    );

    new EmptyCfnResourcePrefixer(node).prefix();
  }

  private registerPrefixer(
    resource: CfnResourceConstructor,
    prefixer: Constructor<CfnResourcePrefixer>
  ): void {
    if (this.prefixers.has(resource)) {
      const resourcePrefixers = this.prefixers.get(resource) ?? [];
      resourcePrefixers.push(prefixer);
      this.prefixers.set(resource, resourcePrefixers);
    } else {
      this.prefixers.set(resource, [prefixer]);
    }
  }
}
