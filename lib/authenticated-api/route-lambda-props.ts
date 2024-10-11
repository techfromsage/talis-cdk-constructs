import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";

import { AuthenticatedApiFunction } from "./authenticated-api-function";

export interface RouteLambdaProps {
  name: string;
  path: string;
  method: apigatewayv2.HttpMethod;
  isPublic?: boolean; // Defaults to false
  requiredScope?: string;
  lambda: AuthenticatedApiFunction;

  // By default there will be an alarm on the duration of the lambda handling
  // this route of 1 second. This can be overriden by setting lamdaDurationAlarmThreshold
  lamdaDurationAlarmThreshold?: cdk.Duration;
}
