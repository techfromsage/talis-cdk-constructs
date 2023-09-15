import { aws_apigatewayv2 as apigatewayv2 } from "aws-cdk-lib";

export const CfnStageProperties: apigatewayv2.CfnStageProps = {
  apiId: "apiId",
  stageName: "stageName",

  // the properties below are optional
  accessLogSettings: {
    destinationArn: "destinationArn",
    format: "format",
  },
  accessPolicyId: "accessPolicyId",
  autoDeploy: false,
  clientCertificateId: "clientCertificateId",
  defaultRouteSettings: {
    dataTraceEnabled: false,
    detailedMetricsEnabled: false,
    loggingLevel: "loggingLevel",
    throttlingBurstLimit: 123,
    throttlingRateLimit: 123,
  },
  deploymentId: "deploymentId",
  description: "description",
  routeSettings: {},
  stageVariables: {},
  tags: {},
};
