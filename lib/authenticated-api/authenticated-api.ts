import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as apigateway2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as authorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as cdk from "@aws-cdk/core";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as cloudwatchActions from "@aws-cdk/aws-cloudwatch-actions";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as path from "path";

import { AuthenticatedApiProps } from "./authenticated-api-props";
import { RouteUrlProps } from "./route-url-props";
import { IAlarmAction } from "@aws-cdk/aws-cloudwatch";

const DEFAULT_API_LATENCY_THRESHOLD = cdk.Duration.minutes(1);
const DEFAULT_LAMBDA_DURATION_THRESHOLD = cdk.Duration.minutes(1);

export class AuthenticatedApi extends cdk.Construct {
  readonly apiId: string;
  readonly httpApiId: string;
  readonly httpApi: apigatewayv2.HttpApi;
  readonly authorizer: apigatewayv2.IHttpRouteAuthorizer;
  readonly alarmAction: IAlarmAction;

  constructor(scope: cdk.Construct, id: string, props: AuthenticatedApiProps) {
    super(scope, id);

    if (
      (props.domainName && !props.certificateArn) ||
      (!props.domainName && props.certificateArn)
    ) {
      cdk.Annotations.of(scope).addError(
        `To use a custom domain name both certificateArn and domainName must be specified`
      );
    }
    const domainName = new apigatewayv2.DomainName(this, "domain-name", {
      domainName: props.domainName,
      certificate: acm.Certificate.fromCertificateArn(
        this,
        "cert",
        props.certificateArn
      ),
    });
    const apiGatewayProps: apigatewayv2.HttpApiProps = {
      apiName: `${props.prefix}${props.name}`,
      defaultDomainMapping: { domainName: domainName },
      ...(props.corsDomain && {
        corsPreflight: {
          allowHeaders: ["*"],
          allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
          allowCredentials: true,
          allowOrigins: props.corsDomain,
        },
      }),
    };

    this.httpApi = new apigatewayv2.HttpApi(
      this,
      `${props.prefix}${props.name}`,
      apiGatewayProps
    );

    this.apiId = this.httpApi.apiId;
    this.httpApiId = this.httpApi.httpApiId;

    new cdk.CfnOutput(this, "apiGatewayEndpoint", {
      exportName: `${props.prefix}${props.name}-endpoint`,
      value: this.httpApi.apiEndpoint,
    });

    this.alarmAction = new cloudwatchActions.SnsAction(props.alarmTopic);

    // Routes may contain required scopes. These scopes need to be in the config
    // of the authorization lambda. Create this config ahead of creating the authorization lambda
    const scopeConfig: { [k: string]: string } = {};
    if (props.lambdaRoutes) {
      for (const routeProps of props.lambdaRoutes) {
        if (routeProps.requiredScope) {
          scopeConfig[`^${routeProps.path}$`] = routeProps.requiredScope;
        }
      }
    }

    // Auth Lambda
    const authLambda = new lambdaNodeJs.NodejsFunction(
      this,
      `${props.prefix}${props.name}-authoriser`,
      {
        functionName: `${props.prefix}${props.name}-authoriser`,

        entry: `${path.resolve(__dirname)}/../../src/lambda/api/authorizer.ts`,
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
        securityGroups: props.securityGroups,
        vpc: props.vpc,
        vpcSubnets: props.vpcSubnets,
      }
    );

    this.authorizer = new authorizers.HttpLambdaAuthorizer(
      "lambda-authorizer",
      authLambda,
      {
        authorizerName: `${props.prefix}${props.name}-http-lambda-authoriser`,
        responseTypes: [authorizers.HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
      }
    );

    if (props.urlRoutes) {
      for (const routeProps of props.urlRoutes) {
        this.addUrlRoute(routeProps);
      }
    }

    if (props.lambdaRoutes) {
      for (const routeProps of props.lambdaRoutes) {
        const integration = new integrations.HttpLambdaIntegration(
          "http-lambda-integration",
          routeProps.lambda
        );

        if (routeProps.isPublic === true) {
          this.httpApi.addRoutes({
            path: routeProps.path,
            methods: [routeProps.method],
            integration,
          });
        } else {
          this.httpApi.addRoutes({
            path: routeProps.path,
            methods: [routeProps.method],
            integration,
            authorizer: this.authorizer,
          });
        }

        // Add Cloudwatch alarms for this route

        // Add an alarm on the duration of the lambda dealing with the HTTP Request
        const durationThreshold = routeProps.lamdaDurationAlarmThreshold
          ? routeProps.lamdaDurationAlarmThreshold
          : DEFAULT_LAMBDA_DURATION_THRESHOLD;
        const durationMetric = routeProps.lambda
          .metric("Duration")
          .with({ period: cdk.Duration.minutes(1), statistic: "sum" });
        const durationAlarm = new cloudwatch.Alarm(
          this,
          `${props.prefix}${props.name}-${routeProps.name}-duration-alarm`,
          {
            alarmName: `${props.prefix}${props.name}-${routeProps.name}-duration-alarm`,
            alarmDescription: `Alarm if duration of lambda for route ${
              props.prefix
            }${props.name}-${
              routeProps.name
            } exceeds duration ${durationThreshold.toMilliseconds()} milliseconds`,
            actionsEnabled: true,
            metric: durationMetric,
            evaluationPeriods: 1,
            threshold: durationThreshold.toMilliseconds(),
            comparisonOperator:
              cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            // Set treatMissingData to IGNORE
            // Stops alarms with minimal data having false alarms when they transition to this state
            treatMissingData: cloudwatch.TreatMissingData.IGNORE,
          }
        );
        durationAlarm.addAlarmAction(this.alarmAction);
        durationAlarm.addOkAction(this.alarmAction);

        const errorsMetric = routeProps.lambda
          .metric("Errors")
          .with({ period: cdk.Duration.minutes(1), statistic: "sum" });

        const errorsAlarm = new cloudwatch.Alarm(
          this,
          `${props.prefix}${props.name}-${routeProps.name}-errors-alarm`,
          {
            alarmName: `${props.prefix}${props.name}-${routeProps.name}-errors-alarm`,
            alarmDescription: `Alarm if errors on api ${props.prefix}${props.name}-${routeProps.name}`,
            actionsEnabled: true,
            metric: errorsMetric,
            evaluationPeriods: 1,
            threshold: 1,
            comparisonOperator:
              cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            // Set treatMissingData to IGNORE
            // Stops alarms with minimal data having false alarms when they transition to this state
            treatMissingData: cloudwatch.TreatMissingData.IGNORE,
          }
        );
        errorsAlarm.addAlarmAction(this.alarmAction);
        errorsAlarm.addOkAction(this.alarmAction);
      }
    }

    // Add a cloudwatch alarm for the latency of the api - this is all routes within the api
    const latencyThreshold = props.apiLatencyAlarmThreshold
      ? props.apiLatencyAlarmThreshold
      : DEFAULT_API_LATENCY_THRESHOLD;
    const metricLatency = this.httpApi
      .metricLatency()
      .with({ statistic: "average", period: cdk.Duration.minutes(1) });

    const routeLatencyAlarm = new cloudwatch.Alarm(
      this,
      `${props.prefix}${props.name}-latency-alarm`,
      {
        alarmName: `${props.prefix}${props.name}-latency-alarm`,
        alarmDescription: `Alarm if latency on api ${props.prefix}${
          props.name
        } exceeds ${latencyThreshold.toMilliseconds()} milliseconds`,
        actionsEnabled: true,
        metric: metricLatency,
        evaluationPeriods: 1,
        threshold: latencyThreshold.toMilliseconds(),
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        // Set treatMissingData to IGNORE
        // Stops alarms with minimal data having false alarms when they transition to this state
        treatMissingData: cloudwatch.TreatMissingData.IGNORE,
      }
    );
    routeLatencyAlarm.addAlarmAction(this.alarmAction);
    routeLatencyAlarm.addOkAction(this.alarmAction);
  }

  addUrlRoute(routeProps: RouteUrlProps) {
    this.httpApi.addRoutes({
      path: routeProps.path,
      methods: [routeProps.method],
      integration: new apigateway2Integrations.HttpUrlIntegration(
        routeProps.name,
        routeProps.baseUrl,
        {
          method: routeProps.method,
        }
      ),
    });
  }
}
