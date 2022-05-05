import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNode from '@aws-cdk/aws-lambda-nodejs';

import { AuthenticatedApiFunctionProps } from './authenticated-api-function-props';

export const MINIMUM_MEMORY_SIZE = 1024;

export class AuthenticatedApiFunction extends lambdaNode.NodejsFunction {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: AuthenticatedApiFunctionProps
  ) {
    if (props.memorySize && props.memorySize < MINIMUM_MEMORY_SIZE) {
      cdk.Annotations.of(scope).addError(
        `lambda memory of ${props.memorySize} is less than the recommended size of ${MINIMUM_MEMORY_SIZE}`
      );
    }

    super(scope, id, {
      functionName: `${props.name}`,
      entry: props.entry,
      environment: props.environment,
      handler: props.handler,
      memorySize: props.memorySize ?? MINIMUM_MEMORY_SIZE,

      // Enforce the following properties
      awsSdkConnectionReuse: true,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: props.timeout,
      securityGroups: [props.securityGroup],
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
    });
  }
}

