#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { SimpleLambdaWorkerStack } from "../lib/simple-lambda-worker-stack";

const app = new cdk.App();
new SimpleLambdaWorkerStack(app, 
  `${process.env.AWS_PREFIX}SimpleLambdaWorkerStack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  }
);
