#!/bin/bash

cd examples/simple-authenticated-api

export CDK_DEFAULT_ACCOUNT=302477901552
export CDK_DEFAULT_REGION=eu-west-1
export AWS_PREFIX=build-20211201-

npm install
npm run build
npx cdk --require-approval never deploy
