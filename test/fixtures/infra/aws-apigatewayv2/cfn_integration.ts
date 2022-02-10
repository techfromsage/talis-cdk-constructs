import { CfnIntegrationProps } from "@aws-cdk/aws-apigatewayv2";

export const CfnIntegrationProperties: CfnIntegrationProps = {
  apiId: 'apiId',
  integrationType: 'integrationType',

  // the properties below are optional
  connectionId: 'connectionId',
  connectionType: 'connectionType',
  contentHandlingStrategy: 'contentHandlingStrategy',
  credentialsArn: 'credentialsArn',
  description: 'description',
  integrationMethod: 'integrationMethod',
  integrationSubtype: 'integrationSubtype',
  integrationUri: 'integrationUri',
  passthroughBehavior: 'passthroughBehavior',
  payloadFormatVersion: 'payloadFormatVersion',
  requestParameters: {},
  requestTemplates: {},
  responseParameters: {},
  templateSelectionExpression: 'templateSelectionExpression',
  timeoutInMillis: 123,
  tlsConfig: {
    serverNameToVerify: 'serverNameToVerify',
  },
};
