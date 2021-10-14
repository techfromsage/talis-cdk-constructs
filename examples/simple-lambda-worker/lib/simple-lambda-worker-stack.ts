import * as cdk from '@aws-cdk/core';

import * as taliscdkconstructs from '../../../lib'; 

import { LambdaWorker, LambdaWorkerProps } from "../../../lib";

export class SimpleLambdaWorkerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const worker = new LambdaWorker(this, `${id}-queue`, {
      name: 'SimpleLambdaWorker'
    });
  }
}
