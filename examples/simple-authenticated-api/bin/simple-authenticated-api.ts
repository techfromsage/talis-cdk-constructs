#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SimpleAuthenticatedApiStack } from "../lib/simple-authenticated-api-stack";

const buildStackTtl = Math.floor(
  (Date.now() + cdk.Duration.days(3).toMilliseconds()) / 1000,
).toString();

const app = new cdk.App();
new SimpleAuthenticatedApiStack(
  app,
  `${process.env.AWS_PREFIX}SimpleAuthenticatedApiStack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    tags: {
      // Auto-expire this stack if created by a build system
      ...(process.env.CI ? { ttl: buildStackTtl } : undefined),
    },
  },
);
