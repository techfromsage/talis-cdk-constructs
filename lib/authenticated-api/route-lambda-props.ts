import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

export interface RouteLambdaProps {
  name: string;
  paths: Array<string>;
  method: apigatewayv2.HttpMethod;
  isPublic?: boolean; // Defaults to false
  requiredScope?: string;

  lambdaProps: {
    entry: string;
    environment?: { [key: string]: string };
    handler: string;
    policyStatements?: iam.PolicyStatement[];
    role?: iam.IRole;
    timeout: cdk.Duration;
  };

  // By default there will be an alarm on the duration of the lambda handling
  // this route of 1 second. This can be overriden by setting lamdaDurationAlarmThreshold
  lamdaDurationAlarmThreshold?: cdk.Duration;
}
