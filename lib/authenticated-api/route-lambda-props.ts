import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2_alpha from '@aws-cdk/aws-apigatewayv2-alpha';

import { AuthenticatedApiFunction } from "./authenticated-api-function";

export interface RouteLambdaProps {
  name: string;
  path: string;
  method: apigatewayv2_alpha.HttpMethod;
  isPublic?: boolean; // Defaults to false
  requiredScope?: string;
  lambda: AuthenticatedApiFunction;

  // By default there will be an alarm on the duration of the lambda handling
  // this route of 1 second. This can be overriden by setting lamdaDurationAlarmThreshold
  lamdaDurationAlarmThreshold?: cdk.Duration;
}
