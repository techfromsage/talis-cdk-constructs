import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface AuthenticatedApiFunctionProps {
  name: string;
  entry: string;
  environment?: { [key: string]: string };
  handler: string;
  timeout: cdk.Duration;
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  securityGroups: Array<ec2.ISecurityGroup>;
  memorySize?: number;
}
