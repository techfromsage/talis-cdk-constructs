import { CfnFunctionProps } from "@aws-cdk/aws-lambda";

export const CfnFunctionProperties: CfnFunctionProps = {
  code: {
    imageUri: "imageUri",
    s3Bucket: "s3Bucket",
    s3Key: "s3Key",
    s3ObjectVersion: "s3ObjectVersion",
    zipFile: "zipFile",
  },
  role: "role",

  // the properties below are optional
  architectures: ["architectures"],
  codeSigningConfigArn: "codeSigningConfigArn",
  deadLetterConfig: {
    targetArn: "targetArn",
  },
  description: "description",
  environment: {
    variables: {
      variablesKey: "variables",
    },
  },
  fileSystemConfigs: [
    {
      arn: "arn",
      localMountPath: "localMountPath",
    },
  ],
  functionName: "functionName",
  handler: "handler",
  imageConfig: {
    command: ["command"],
    entryPoint: ["entryPoint"],
    workingDirectory: "workingDirectory",
  },
  kmsKeyArn: "kmsKeyArn",
  layers: ["layers"],
  memorySize: 123,
  packageType: "packageType",
  reservedConcurrentExecutions: 123,
  runtime: "runtime",
  tags: [
    {
      key: "key",
      value: "value",
    },
  ],
  timeout: 123,
  tracingConfig: {
    mode: "mode",
  },
  vpcConfig: {
    securityGroupIds: ["securityGroupIds"],
    subnetIds: ["subnetIds"],
  },
};
