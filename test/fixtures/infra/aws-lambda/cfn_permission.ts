import { CfnPermissionProps } from "@aws-cdk/aws-lambda";

export const CfnPermissionProperties: CfnPermissionProps = {
  action: "action",
  functionName: "functionName",
  principal: "principal",

  // the properties below are optional
  eventSourceToken: "eventSourceToken",
  sourceAccount: "sourceAccount",
  sourceArn: "sourceArn",
};
