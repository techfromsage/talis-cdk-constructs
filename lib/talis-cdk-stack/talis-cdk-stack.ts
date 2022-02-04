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
