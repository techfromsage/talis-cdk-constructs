import { CfnStageProps } from "@aws-cdk/aws-apigatewayv2";

export const CfnStageProperties: CfnStageProps = {
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
