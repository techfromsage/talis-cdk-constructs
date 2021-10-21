import * as cdk from '@aws-cdk/core';

import { HttpMethod } from '@aws-cdk/aws-apigatewayv2';

import { AuthenticatedApi } from "../../../lib";

export class SimpleAuthenticatedApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use AWS_PREFIX to give all resources in this sample
    // a unique name. This is usually `development-xx` where xx are your initials.
    // If you do not set AWS_PREFIX, when you deploy this stack, it may conflict
    // with someone elses stack who has also not set AWS_PREFIX
    const prefix = process.env.AWS_PREFIX
      ? process.env.AWS_PREFIX
      : "development-xx-";

    /* const api = */ new AuthenticatedApi(
      this,
      'simple-authenticated-api',
      {
        prefix,
        name: 'simple-authenticated-api',
        description: 'A simple example API',
        stageName: 'development', // This should be development / staging / production as appropriate

        authenticateAllRoutes: false,
        persona: {
          host: 'staging-users.talis.com',
          scheme: 'https',
          port: '443',
          oauth_route: '/oauth/tokens/',
        },

        routes: [
          { name: 'route1', path: '/1/route1', method: HttpMethod.GET, entry: 'src/lambda/route1.js', handler: 'route', },
          { name: 'route2', path: '/1/route2', method: HttpMethod.GET, entry: 'src/lambda/route2.js', handler: 'route', },
        ]
      }
    );
  }
}
