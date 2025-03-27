#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SimpleAuthenticatedRestApiStack } from "../lib/simple-authenticated-rest-api-stack";

const app = new cdk.App();
new SimpleAuthenticatedRestApiStack(
  app,
  `${process.env.AWS_PREFIX}SimpleAuthenticatedRestApiStack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  },
);
