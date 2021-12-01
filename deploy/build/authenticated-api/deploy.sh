#!/bin/bash

cd examples/simple-authenticated-api

export AWS_PREFIX=build-20211201-

npm install
npm run build
cdk deploy
