import { CfnResource, IAspect, IConstruct } from "@aws-cdk/core";
import {
  Apigatewayv2CfnApiPrefixer,
  Apigatewayv2CfnRoutePrefixer,
  Apigatewayv2CfnStagePrefixer,
  Apigatewayv2CfnIntegrationPrefixer,
  DynamoDbCfnTablePrefixer,
  Ec2CfnSecurityGroupPrefixer,
  IamCfnRolePrefixer,
  LambdaCfnFunctionPrefixer,
  LambdaCfnPermissionPrefixer,
} from "./prefixers";
import { CfnResourcePrefixer } from "./cfn_resource_prefixer";
import { CfnTable } from "@aws-cdk/aws-dynamodb";
import { CfnApi, CfnStage, CfnIntegration, CfnRoute } from "@aws-cdk/aws-apigatewayv2";
import { CfnFunction, CfnPermission } from "@aws-cdk/aws-lambda";
import { CfnSecurityGroup } from "@aws-cdk/aws-ec2";
import { CfnRole } from "@aws-cdk/aws-iam";

export type Constructor<T> = { new (...args: any[]): T };

export class ResourcePrefixer implements IAspect {
  private prefix: string;
  private prefixers: Map<
    Constructor<CfnResource>,
    Constructor<CfnResourcePrefixer>[]
  >;

  constructor(prefix: string) {
    this.prefix = prefix;
    this.prefixers = new Map<
      Constructor<CfnResource>,
      Constructor<CfnResourcePrefixer>[]
    >();

    this.registerPrefixer(CfnTable, DynamoDbCfnTablePrefixer);
    this.registerPrefixer(CfnApi, Apigatewayv2CfnApiPrefixer);
    this.registerPrefixer(CfnRoute, Apigatewayv2CfnRoutePrefixer);
    this.registerPrefixer(CfnStage, Apigatewayv2CfnStagePrefixer);
    this.registerPrefixer(CfnIntegration, Apigatewayv2CfnIntegrationPrefixer);
    this.registerPrefixer(CfnSecurityGroup, Ec2CfnSecurityGroupPrefixer);
    this.registerPrefixer(CfnRole, IamCfnRolePrefixer);
    this.registerPrefixer(CfnFunction, LambdaCfnFunctionPrefixer);
    this.registerPrefixer(CfnPermission, LambdaCfnPermissionPrefixer);
  }

  public visit(node: IConstruct): void {
    // We only care about Cloudformation Resources so skip anything that isnot one
    if (!(node instanceof CfnResource)) {
      return;
    }

    for (const key of this.prefixers.keys()) {
      if (node instanceof key) {
        this.prefixers.get(key)?.forEach((prefixer) => {
          new prefixer(node, this.prefix).prefix();
        });
        // Return after running prefixers for resource as only one resource should match
        return;
      }
    }

    throw new Error(
      `Undefined resource for resource prefixer: ${node.cfnResourceType}`
    );
  }

  private registerPrefixer(
    resource: Constructor<CfnResource>,
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
