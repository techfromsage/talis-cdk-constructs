import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export interface AuthenticatedApiFunctionProps {
  name: string;
  entry: string;
  environment?: { [key: string]: string };
  handler: string;
  timeout: cdk.Duration;
  vpc: ec2.IVpc;
  securityGroup: ec2.SecurityGroup;
  memorySize?: number;
}

