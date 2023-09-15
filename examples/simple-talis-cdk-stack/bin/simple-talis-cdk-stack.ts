#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SimpleTalisCdkStack } from "../lib/simple-talis-cdk-stack";
import { TalisDeploymentEnvironment } from "../../../lib";

const app = new cdk.App();
new SimpleTalisCdkStack(
  app,
  `${process.env.AWS_PREFIX}SimpleTalisCdkStackStack`,
  {
    release: "0.1.0",
    app: "simple-talis-cdk-stack",
    deploymentEnvironment: TalisDeploymentEnvironment.DEVELOPMENT,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  },
);
