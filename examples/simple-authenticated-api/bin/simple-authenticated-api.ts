#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SimpleAuthenticatedApiStack } from "../lib/simple-authenticated-api-stack";

const app = new cdk.App();
new SimpleAuthenticatedApiStack(
  app,
  `${process.env.AWS_PREFIX}SimpleAuthenticatedApiStack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  },
);
