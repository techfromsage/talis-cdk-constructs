import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';

export interface RouteLambdaProps {
  name: string;
  paths: Array<string>;
  method: apigatewayv2.HttpMethod,
  entry: string;
  handler: string;
  requiresAuth?: boolean;
}
