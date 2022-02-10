import { CfnRouteProps } from "@aws-cdk/aws-apigatewayv2";

export const CfnRouteProperties: CfnRouteProps = {
  apiId: 'apiId',
  routeKey: 'routeKey',

  // the properties below are optional
  apiKeyRequired: false,
  authorizationScopes: ['authorizationScopes'],
  authorizationType: 'authorizationType',
  authorizerId: 'authorizerId',
  modelSelectionExpression: 'modelSelectionExpression',
  operationName: 'operationName',
  requestModels: {},
  requestParameters: {},
  routeResponseSelectionExpression: 'routeResponseSelectionExpression',
  target: 'target',
};
