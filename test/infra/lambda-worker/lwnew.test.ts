import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LambdaWorker } from '../../../lib/lwnew/lambda-worker';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/project-stack.ts
test('lwnew Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new cdk.Stack(app, 'MyTestStack');
  const lw = new LambdaWorker(stack, 'MyTestConstruct');
    // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300
  });
});
