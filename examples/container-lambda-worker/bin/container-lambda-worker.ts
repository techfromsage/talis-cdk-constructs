#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ContainerLambdaWorkerStack } from '../lib/container-lambda-worker-stack';

const app = new cdk.App();
new ContainerLambdaWorkerStack(app,
  `${process.env.AWS_PREFIX}ContainerLambdaWorkerStack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
