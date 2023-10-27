#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SimpleCdnSiteHostingConstructStack } from "../lib/simple-cdn-site-hosting-construct-stack";

const app = new cdk.App();
new SimpleCdnSiteHostingConstructStack(
  app,
  `${process.env.AWS_PREFIX}simple-cdn-site-hosting-construct-stack`,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  },
);
