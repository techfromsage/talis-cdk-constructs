import * as apigatewayv2 from '@aws-cdk/aws-apigatewayv2';
import * as authorizers from '@aws-cdk/aws-apigatewayv2-authorizers';
import * as integrations from '@aws-cdk/aws-apigatewayv2-integrations';
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";



import { AuthenticatedApiProps } from "./authenticated-api-props";

export class AuthenticatedApi extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: AuthenticatedApiProps) {
    super(scope, id);

    const httpApi = new apigatewayv2.HttpApi(this, `${props.prefix}${props.name}`);

    // Auth Lambda
    const authLambda = new lambdaNodeJs.NodejsFunction(this, `${props.prefix}${props.name}-authoriser`, {
      functionName: `${props.prefix}${props.name}-authoriser`,

      entry: '../../src/lambda/api/authorizer.js',
      handler: 'validateToken',

      bundling: {
        externalModules: [
          'aws-sdk',

          // hiredis is pulled in as a dependency from talis-node
          // It has dependencies on gcc g++ and python to compile code during an npm install
          // The redis cache is an optional parameter to the persona client in talis-node
          // which we do not use in serverless projects. Remove this from the bundle created
          // by esbuild to remove unnecessary issues with gcc/g++/python/node which have
          // no impact as we do not use redis here.
          'hiredis',
        ],
      },

      environment: {
        PERSONA_CLIENT_NAME: `${props.prefix}${props.name}-authoriser`,
        PERSONA_HOST: props.persona.host,
        PERSONA_SCHEME: props.persona.scheme,
        PERSONA_PORT: props.persona.port,
        PERSONA_OAUTH_ROUTE: props.persona.oauth_route,
      },

      awsSdkConnectionReuse: true,
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    const authorizer = new authorizers.HttpLambdaAuthorizer({
      authorizerName: `${props.prefix}${props.name}-http-lambda-authoriser`,
      responseTypes: [authorizers.HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
      handler: authLambda,
    });

    for( const routeLambdaProps of props.routes) {
      // Create the lambda
      const routeLambda = new lambdaNodeJs.NodejsFunction(this, `${props.prefix}${routeLambdaProps.name}`, {
        functionName: `${props.prefix}${props.name}-${routeLambdaProps.name}`,

        /* entry: "examples/simple-authenticated-api/src/lambda/route.js", */
        entry: routeLambdaProps.entry,
        handler: routeLambdaProps.handler,

        // Enforce the following properties
        awsSdkConnectionReuse: true,
        runtime: lambda.Runtime.NODEJS_14_X,
      });

      const integration = new integrations.LambdaProxyIntegration({
        handler: routeLambda,
      });

      httpApi.addRoutes({
        path: routeLambdaProps.path,
        methods: [ routeLambdaProps.method ],
        integration,
        authorizer,
      });
    }
  }
}
