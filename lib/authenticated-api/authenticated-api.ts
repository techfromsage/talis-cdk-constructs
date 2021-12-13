import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as authorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as cdk from "@aws-cdk/core";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as cloudwatchActions from "@aws-cdk/aws-cloudwatch-actions";
import * as iam from "@aws-cdk/aws-iam";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as path from "path";

import { Construct as CoreConstruct } from '@aws-cdk/core';

import { AuthenticatedApiProps } from "./authenticated-api-props";

const DEFAULT_API_LATENCY_THRESHOLD = cdk.Duration.minutes(1);
const DEFAULT_LAMBDA_DURATION_THRESHOLD = cdk.Duration.minutes(1);

enum HttpLambdaResponseType {
  /** Returns simple boolean response */
  SIMPLE,

  /** Returns an IAM Policy */
  IAM,
}

function lambdaAuthorizerArn(handler: lambda.IFunction) {
  return `arn:${cdk.Stack.of(handler).partition}:apigateway:${cdk.Stack.of(handler).region}:lambda:path/2015-03-31/functions/${handler.functionArn}/invocations`;
}
class TestHttpLambdaAuthorizer implements apigatewayv2.IHttpRouteAuthorizer {
  public authorizer?: apigatewayv2.HttpAuthorizer;
  private httpApi?: apigatewayv2.IHttpApi;

  constructor(private readonly props: authorizers.HttpLambdaAuthorizerProps) {
  }

  public bind(options: apigatewayv2.HttpRouteAuthorizerBindOptions): apigatewayv2.HttpRouteAuthorizerConfig {
    if (this.httpApi && (this.httpApi.apiId !== options.route.httpApi.apiId)) {
      throw new Error('Cannot attach the same authorizer to multiple Apis');
    }

    if (!this.authorizer) {
      const id = this.props.authorizerName;

      const responseTypes = this.props.responseTypes ?? [HttpLambdaResponseType.IAM];
      const enableSimpleResponses = responseTypes.includes(HttpLambdaResponseType.SIMPLE) || undefined;

      this.httpApi = options.route.httpApi;
      this.authorizer = new apigatewayv2.HttpAuthorizer(options.scope, id, {
        httpApi: options.route.httpApi,
        identitySource: this.props.identitySource ?? [
          '$request.header.Authorization',
        ],
        type: apigatewayv2.HttpAuthorizerType.LAMBDA,
        authorizerName: this.props.authorizerName,
        enableSimpleResponses,
        payloadFormatVersion: enableSimpleResponses ? apigatewayv2.AuthorizerPayloadVersion.VERSION_2_0 : apigatewayv2.AuthorizerPayloadVersion.VERSION_1_0,
        authorizerUri: lambdaAuthorizerArn(this.props.handler),
        resultsCacheTtl: this.props.resultsCacheTtl ?? cdk.Duration.minutes(5),
      });

      this.props.handler.addPermission(`${cdk.Names.nodeUniqueId(this.authorizer.node)}-Permission`, {
        scope: options.scope as CoreConstruct,
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: cdk.Stack.of(options.route).formatArn({
          service: 'execute-api',
          resource: options.route.httpApi.apiId,
          resourceName: `authorizers/${this.authorizer.authorizerId}`,
        }),
      });
    }

    return {
      authorizerId: this.authorizer.authorizerId,
      authorizationType: 'CUSTOM',
    };
  }
}

export class AuthenticatedApi extends cdk.Construct {
  readonly apiId: string;
  readonly httpApiId: string;

  constructor(scope: cdk.Construct, id: string, props: AuthenticatedApiProps) {
    super(scope, id);

    const alarmAction = new cloudwatchActions.SnsAction(props.alarmTopic);

    const httpApi = new apigatewayv2.HttpApi(
      this,
      `${props.prefix}${props.name}`
    );

    this.apiId = httpApi.apiId;
    this.httpApiId = httpApi.httpApiId;

    // Routes may contain required scopes. These scopes need to be in the config
    // of the authorization lambda. Create this config ahead of creating the authorization lambda
    const scopeConfig: { [k: string]: string } = {};
    for (const routeProps of props.routes) {
      if (routeProps.requiredScope) {
        for (const path of routeProps.paths) {
          scopeConfig[`^${path}$`] = routeProps.requiredScope;
        }
      }
    }

    // Auth Lambda
    const authLambda = new lambdaNodeJs.NodejsFunction(
      this,
      `${props.prefix}${props.name}-authoriser`,
      {
        functionName: `${props.prefix}${props.name}-authoriser`,

        entry: `${path.resolve(__dirname)}/../../src/lambda/api/authorizer.js`,
        handler: "validateToken",

        bundling: {
          externalModules: [
            "aws-sdk",

            // hiredis is pulled in as a dependency from talis-node
            // It has dependencies on gcc g++ and python to compile code during an npm install
            // The redis cache is an optional parameter to the persona client in talis-node
            // which we do not use in serverless projects. Remove this from the bundle created
            // by esbuild to remove unnecessary issues with gcc/g++/python/node which have
            // no impact as we do not use redis here.
            "hiredis",
          ],
        },

        environment: {
          PERSONA_CLIENT_NAME: `${props.prefix}${props.name}-authoriser`,
          PERSONA_HOST: props.persona.host,
          PERSONA_SCHEME: props.persona.scheme,
          PERSONA_PORT: props.persona.port,
          PERSONA_OAUTH_ROUTE: props.persona.oauth_route,
          SCOPE_CONFIG: JSON.stringify(scopeConfig),
        },

        awsSdkConnectionReuse: true,
        runtime: lambda.Runtime.NODEJS_14_X,
        timeout: cdk.Duration.minutes(2),
        securityGroup: props.securityGroup,
        vpc: props.vpc,
        vpcSubnets: props.vpcSubnets,
      }
    );

    /* const authorizer = new authorizers.HttpLambdaAuthorizer({ */
    const authorizer = new TestHttpLambdaAuthorizer({
      authorizerName: `${props.prefix}${props.name}-http-lambda-authoriser`,
      responseTypes: [authorizers.HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
      handler: authLambda,
    });

    /* const authorizer = new apigatewayv2.HttpAuthorizer(this, `${props.prefix}${props.name}-authorizer`, { */
    /*   httpApi: httpApi, */
    /*   identitySource: [], */
    /*   type: apigatewayv2.HttpAuthorizerType.LAMBDA, */
    /*   authorizerUri: `arn:aws:apigateway:${cdk.Stack.of(this).region}:lambda:path/2015-03-31/functions/${authLambda.functionArn}/invocations`, */
    /* }); */
    if (authorizer.authorizer) {
      authorizer.authorizer.node.addDependency(authLambda);
    }

    for (const routeProps of props.routes) {
      // Create the lambda
      const routeLambda = new lambdaNodeJs.NodejsFunction(
        this,
        `${props.prefix}${routeProps.name}`,
        {
          functionName: `${props.prefix}${props.name}-${routeProps.name}`,

          entry: routeProps.lambdaProps.entry,
          environment: routeProps.lambdaProps.environment,
          handler: routeProps.lambdaProps.handler,

          // Enforce the following properties
          awsSdkConnectionReuse: true,
          runtime: lambda.Runtime.NODEJS_14_X,
          timeout: routeProps.lambdaProps.timeout,
          securityGroup: props.securityGroup,
          vpc: props.vpc,
          vpcSubnets: props.vpcSubnets,
        }
      );

      if (routeProps.lambdaProps.policyStatements) {
        for (const statement of routeProps.lambdaProps.policyStatements) {
          routeLambda.role?.addToPolicy(statement);
        }
      }

      const integration = new integrations.LambdaProxyIntegration({
        handler: routeLambda,
      });

      for (const path of routeProps.paths) {
        if (routeProps.isPublic === true) {
          httpApi.addRoutes({
            path: path,
            methods: [routeProps.method],
            integration,
          });
        } else {
          httpApi.addRoutes({
            path: path,
            methods: [routeProps.method],
            integration,
            authorizer,
          });
        }
      }

      // Add Cloudwatch alarms for this route

      // Add an alarm on the duration of the lambda dealing with the HTTP Request
      const durationThreshold = routeProps.lamdaDurationAlarmThreshold
        ? routeProps.lamdaDurationAlarmThreshold
        : DEFAULT_LAMBDA_DURATION_THRESHOLD;
      const durationMetric = routeLambda.metric("Duration");
      const durationAlarm = new cloudwatch.Alarm(
        this,
        `${props.prefix}${props.name}-${routeProps.name}-duration-alarm`,
        {
          alarmName: `${props.prefix}${props.name}-${routeProps.name}-duration-alarm`,
          alarmDescription: `Alarm if duration of lambda for route ${
            props.name
          }-${
            routeProps.name
          } exceeds duration ${durationThreshold.toMilliseconds()} milliseconds`,
          actionsEnabled: true,
          metric: durationMetric,
          statistic: "sum",
          period: cdk.Duration.minutes(1),
          evaluationPeriods: 1,
          threshold: durationThreshold.toMilliseconds(),
          comparisonOperator:
            cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          // Set treatMissingData to IGNORE
          // Stops alarms with minimal data having false alarms when they transition to this state
          treatMissingData: cloudwatch.TreatMissingData.IGNORE,
        }
      );
      durationAlarm.addAlarmAction(alarmAction);
      durationAlarm.addOkAction(alarmAction);
    }

    // Add a cloudwatch alarm for the latency of the api - this is all routes within the api
    const latencyThreshold = props.apiLatencyAlarmThreshold
      ? props.apiLatencyAlarmThreshold
      : DEFAULT_API_LATENCY_THRESHOLD;
    const metricLatency = httpApi.metricLatency(); //{

    const routeLatencyAlarm = new cloudwatch.Alarm(
      this,
      `${props.prefix}${props.name}-latency-alarm`,
      {
        alarmName: `${props.prefix}${props.name}-latency-alarm`,
        alarmDescription: `Alarm if latency on api ${
          props.name
        } exceeds ${latencyThreshold.toMilliseconds()} milliseconds`,
        actionsEnabled: true,
        metric: metricLatency,
        statistic: "sum",
        period: cdk.Duration.minutes(1),
        evaluationPeriods: 1,
        threshold: latencyThreshold.toMilliseconds(),
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        // Set treatMissingData to IGNORE
        // Stops alarms with minimal data having false alarms when they transition to this state
        treatMissingData: cloudwatch.TreatMissingData.IGNORE,
      }
    );
    routeLatencyAlarm.addAlarmAction(alarmAction);
    routeLatencyAlarm.addOkAction(alarmAction);
  }
}
