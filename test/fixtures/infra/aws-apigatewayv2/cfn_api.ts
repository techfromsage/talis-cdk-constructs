import { CfnApiProps } from "@aws-cdk/aws-apigatewayv2";

export const CfnApiProperties: CfnApiProps = {
  apiKeySelectionExpression: "apiKeySelectionExpression",
  basePath: "basePath",
  body: {},
  bodyS3Location: {
    bucket: "bucket",
    etag: "etag",
    key: "key",
    version: "version",
  },
  corsConfiguration: {
    allowCredentials: false,
    allowHeaders: ["allowHeaders"],
    allowMethods: ["allowMethods"],
    allowOrigins: ["allowOrigins"],
    exposeHeaders: ["exposeHeaders"],
    maxAge: 123,
  },
  credentialsArn: "credentialsArn",
  description: "description",
  disableExecuteApiEndpoint: false,
  disableSchemaValidation: false,
  failOnWarnings: false,
  name: "apiName",
  protocolType: "protocolType",
  routeKey: "routeKey",
  routeSelectionExpression: "routeSelectionExpression",
  tags: {},
  target: "target",
  version: "version",
};
