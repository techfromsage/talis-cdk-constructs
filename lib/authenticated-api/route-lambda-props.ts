import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";

export interface RouteLambdaProps {
  name: string;
  paths: Array<string>;
  method: apigatewayv2.HttpMethod;
  requiresAuth?: boolean;

  lambdaProps: {
    entry: string;
    handler: string;
    timeout: cdk.Duration;
  };

  // By default there will be an alarm on the duration of the lambda handling
  // this route of 1 second. This can be overriden by setting lamdaDurationAlarmThreshold
  lamdaDurationAlarmThreshold?: cdk.Duration;
}
