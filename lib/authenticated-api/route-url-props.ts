import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";

export interface RouteUrlProps {
  name: string;
  baseUrl: string;
  path: string;
  method: apigatewayv2_alpha.HttpMethod;
  isPublic?: boolean; // Defaults to false
  requiredScope?: string;
}
