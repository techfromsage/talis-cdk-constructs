import * as cdk from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_lambda_nodejs as lambdaNode } from "aws-cdk-lib";
import { Construct } from "constructs";

import { AuthenticatedApiFunctionProps } from "./authenticated-api-function-props";
import { buildLambdaEnvironment } from "../util/build-lambda-environment";

export const MINIMUM_MEMORY_SIZE = 1024;

export class AuthenticatedApiFunction extends lambdaNode.NodejsFunction {
  constructor(
    scope: Construct,
    id: string,
    props: AuthenticatedApiFunctionProps,
  ) {
    if (props.memorySize && props.memorySize < MINIMUM_MEMORY_SIZE) {
      cdk.Annotations.of(scope).addError(
        `lambda memory of ${props.memorySize} is less than the recommended size of ${MINIMUM_MEMORY_SIZE}`,
      );
    }

    super(scope, id, {
      functionName: `${props.name}`,
      entry: props.entry,
      environment: buildLambdaEnvironment({
        environment: props.environment,
        timeout: props.timeout,
      }),
      handler: props.handler,
      memorySize: props.memorySize ?? MINIMUM_MEMORY_SIZE,

      // Enforce the following properties
      awsSdkConnectionReuse: true,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: props.timeout,
      securityGroups: props.securityGroups,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      bundling: props.bundling,
    });
  }
}
