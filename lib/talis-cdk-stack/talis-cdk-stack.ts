import * as cdk from '@aws-cdk/core';

import { IVpc, Vpc } from "@aws-cdk/aws-ec2";
import { Stack, Construct, RemovalPolicy } from "@aws-cdk/core";
import { TalisCdkStackProps } from "./talis-cdk-stack-props";
import { TalisDeploymentEnvironment } from "./talis-deployment-environment";

export class TalisCdkStack extends Stack {
  protected readonly vpc: IVpc;

  constructor(scope: Construct, id: string, props: TalisCdkStackProps) {
    super(scope, id, props);
    if (props.vpcId) {
      this.vpc = this.resolveVpc(props.vpcId);
    }

    cdk.Tags.of(scope).add('tfs-app', props.app); // e.g. depot
    cdk.Tags.of(scope).add('tfs-environment', props.deploymentEnvironment); // e.g. production staging development
    cdk.Tags.of(scope).add('tfs-release', props.release); // e.g. 8561-105814f

    // props.env comes from aws cdk core StackProps. It's optional
    // so that an environment agnostic stack can be created.
    // If we create an environment agnostic stack - it can not contain
    // region or service.
    // However, when we deploy into our environments for real - props.env will be set
    if (props.env?.region) {
      cdk.Tags.of(scope).add('tfs-region', props.env.region);
      cdk.Tags.of(scope).add('tfs-service', `${props.app}-${props.env.region.split('-')[0]}`);
    }
  }

  getRemovalPolicyForTalisDeploymentEnvironment(
    environment: TalisDeploymentEnvironment
  ): RemovalPolicy {
    switch (environment) {
      case TalisDeploymentEnvironment.BUILD:
      case TalisDeploymentEnvironment.DEVELOPMENT:
      case TalisDeploymentEnvironment.TEST:
        return RemovalPolicy.DESTROY;
      case TalisDeploymentEnvironment.STAGING:
        return RemovalPolicy.SNAPSHOT;
      case TalisDeploymentEnvironment.PRODUCTION:
        return RemovalPolicy.RETAIN;
      default:
        return RemovalPolicy.RETAIN;
    }
  }

  private resolveVpc(vpcId: string): IVpc {
    return Vpc.fromLookup(this, vpcId, { vpcId });
  }
}
