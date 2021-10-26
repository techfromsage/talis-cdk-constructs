import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as authorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as cdk from "@aws-cdk/core";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as cloudwatchActions from "@aws-cdk/aws-cloudwatch-actions";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";

import { AuthenticatedApiProps } from "./authenticated-api-props";

const DEFAULT_API_LATENCY_THRESHOLD = cdk.Duration.minutes(1);
const DEFAULT_LAMBDA_DURATION_THRESHOLD = cdk.Duration.minutes(1);

export class AuthenticatedApi extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: AuthenticatedApiProps) {
    super(scope, id);

    const alarmAction = new cloudwatchActions.SnsAction(props.alarmTopic);

    const httpApi = new apigatewayv2.HttpApi(
      this,
      `${props.prefix}${props.name}`
    );

    // Auth Lambda
    const authLambda = new lambdaNodeJs.NodejsFunction(
      this,
      `${props.prefix}${props.name}-authoriser`,
      {
        functionName: `${props.prefix}${props.name}-authoriser`,

        entry: "../../src/lambda/api/authorizer.js",
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
        },

        awsSdkConnectionReuse: true,
        runtime: lambda.Runtime.NODEJS_14_X,
      }
    );

    const authorizer = new authorizers.HttpLambdaAuthorizer({
      authorizerName: `${props.prefix}${props.name}-http-lambda-authoriser`,
      responseTypes: [authorizers.HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
      handler: authLambda,
    });

    for (const routeLambdaProps of props.routes) {
      // Create the lambda
      const routeLambda = new lambdaNodeJs.NodejsFunction(
        this,
        `${props.prefix}${routeLambdaProps.name}`,
        {
          functionName: `${props.prefix}${props.name}-${routeLambdaProps.name}`,

          entry: routeLambdaProps.entry,
          handler: routeLambdaProps.handler,

          // Enforce the following properties
          awsSdkConnectionReuse: true,
          runtime: lambda.Runtime.NODEJS_14_X,
        }
      );

      const integration = new integrations.LambdaProxyIntegration({
        handler: routeLambda,
      });

      for (const path of routeLambdaProps.paths) {
        if (props.authenticateAllRoutes === true || routeLambdaProps.requiresAuth) {
          httpApi.addRoutes({
            path: path,
            methods: [routeLambdaProps.method],
            integration,
            authorizer,
          });
        } else {
          httpApi.addRoutes({
            path: path,
            methods: [routeLambdaProps.method],
            integration,
          });
        }
      }

      // Add Cloudwatch alarms for this route

      // Add an alarm on the duration of the lambda dealing with the HTTP Request
      const durationThreshold = routeLambdaProps.lamdaDurationAlarmThreshold
        ? routeLambdaProps.lamdaDurationAlarmThreshold
        : DEFAULT_LAMBDA_DURATION_THRESHOLD;
      const durationMetric = routeLambda.metric("Duration");
      const durationAlarm = new cloudwatch.Alarm(
        this,
        `${props.name}-${routeLambdaProps.name}-duration-alarm`,
        {
          alarmName: `${props.name}-${routeLambdaProps.name}-duration-alarm`,
          alarmDescription: `Alarm if duration of lambda for route ${
            props.name
          }-${
            routeLambdaProps.name
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
      `${props.name}-latency-alarm`,
      {
        alarmName: `${props.name}-latency-alarm`,
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
