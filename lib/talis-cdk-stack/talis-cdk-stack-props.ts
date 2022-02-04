import { StackProps } from "@aws-cdk/core";
import { TalisDeploymentEnvironment } from "./talis-deployment-environment";

export interface TalisCdkStackProps extends StackProps {
  // ID of the VPC to deploy stack resources into
  readonly vpcId?: string;
  // Environment the stack is deployed into
  readonly deploymentEnvironment: TalisDeploymentEnvironment;
}
