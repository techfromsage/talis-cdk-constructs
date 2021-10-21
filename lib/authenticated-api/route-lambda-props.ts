import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';

export interface RouteLambdaProps {
  name: string;
  path: string;
  method: apigatewayv2.HttpMethod,
  entry: string;
  handler: string;
}
