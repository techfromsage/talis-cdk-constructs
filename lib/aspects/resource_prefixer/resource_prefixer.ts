import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import { aws_apigatewayv2 as apigatewayv2 } from "aws-cdk-lib";
import { IConstruct } from "constructs";

import {
  Apigatewayv2CfnApiPrefixer,
  DynamoDbCfnTablePrefixer,
  Ec2CfnSecurityGroupPrefixer,
  IamCfnRolePrefixer,
  LambdaCfnFunctionPrefixer,
} from "./prefixers";
import { CfnResourcePrefixer } from "./cfn_resource_prefixer";
import { EmptyCfnResourcePrefixer } from "./prefixers/empty_cfn_resource_prefixer";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Constructor<T> = { new (...args: any[]): T };

type CfnResourceConstructor = {
  new (...args: any[]): cdk.CfnResource;
  CFN_RESOURCE_TYPE_NAME: string;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export class ResourcePrefixer implements cdk.IAspect {
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

    this.registerPrefixer(dynamodb.CfnTable, DynamoDbCfnTablePrefixer);
    this.registerPrefixer(apigatewayv2.CfnApi, Apigatewayv2CfnApiPrefixer);
    this.registerPrefixer(ec2.CfnSecurityGroup, Ec2CfnSecurityGroupPrefixer);
    this.registerPrefixer(iam.CfnRole, IamCfnRolePrefixer);
    this.registerPrefixer(lambda.CfnFunction, LambdaCfnFunctionPrefixer);
  }

  public visit(node: IConstruct): void {
    // We only care about Cloudformation Resources so skip anything that isnot one
    if (!cdk.CfnResource.isCfnResource(node)) {
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

    cdk.Annotations.of(node).addWarning(
      `No defined resource prefixer for: ${node.cfnResourceType}`,
    );

    new EmptyCfnResourcePrefixer(node).prefix();
  }

  private registerPrefixer(
    resource: CfnResourceConstructor,
    prefixer: Constructor<CfnResourcePrefixer>,
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
