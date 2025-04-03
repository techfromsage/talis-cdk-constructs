import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { BundlingOptions } from "aws-cdk-lib/aws-lambda-nodejs";

export interface AuthenticatedRestApiFunctionProps {
  name: string;
  entry: string;
  environment?: { [key: string]: string };
  handler: string;
  timeout: cdk.Duration;
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  securityGroups?: Array<ec2.ISecurityGroup>;
  memorySize?: number;
  bundling?: BundlingOptions;
}
