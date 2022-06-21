import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as authorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as cdk from "@aws-cdk/core";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as cloudwatchActions from "@aws-cdk/aws-cloudwatch-actions";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as path from "path";

import { AuthenticatedApiProps } from "./authenticated-api-props";
import { RouteLambdaProps } from "./route-lambda-props";
import { IAlarmAction } from "@aws-cdk/aws-cloudwatch";

const DEFAULT_API_LATENCY_THRESHOLD = cdk.Duration.minutes(1);
const DEFAULT_LAMBDA_DURATION_THRESHOLD = cdk.Duration.minutes(1);

export class AuthenticatedApi extends cdk.Construct {
  readonly apiId: string;
  readonly httpApiId: string;
  readonly httpApi: apigatewayv2.HttpApi;
  readonly authorizer: apigatewayv2.IHttpRouteAuthorizer;
  readonly props: AuthenticatedApiProps;
  readonly alarmAction: IAlarmAction;

  constructor(scope: cdk.Construct, id: string, propsX: AuthenticatedApiProps) {
    super(scope, id);

    this.props = propsX;

    if (
      (this.props.domainName && !this.props.certificateArn) ||
      (!this.props.domainName && this.props.certificateArn)
    ) {
      cdk.Annotations.of(scope).addError(
        `To use a custom domain name both certificateArn and domainName must be specified`
      );
    }
    const domainName = new apigatewayv2.DomainName(this, "domain-name", {
      domainName: this.props.domainName,
      certificate: acm.Certificate.fromCertificateArn(
        this,
        "cert",
        this.props.certificateArn
      ),
    });
    const apiGatewayProps: apigatewayv2.HttpApiProps = {
      apiName: `${this.props.prefix}${this.props.name}`,
      defaultDomainMapping: { domainName: domainName },
      ...(this.props.corsDomain && {
        corsPreflight: {
          allowHeaders: ["*"],
          allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
          allowCredentials: true,
          allowOrigins: this.props.corsDomain,
        },
      }),
    };

    this.httpApi = new apigatewayv2.HttpApi(
      this,
      `${this.props.prefix}${this.props.name}`,
      apiGatewayProps
    );

    this.apiId = this.httpApi.apiId;
    this.httpApiId = this.httpApi.httpApiId;

    new cdk.CfnOutput(this, "apiGatewayEndpoint", {
      exportName: `${this.props.prefix}${this.props.name}-endpoint`,
      value: this.httpApi.apiEndpoint,
    });

    this.alarmAction = new cloudwatchActions.SnsAction(this.props.alarmTopic);

    // Routes may contain required scopes. These scopes need to be in the config
    // of the authorization lambda. Create this config ahead of creating the authorization lambda
    const scopeConfig: { [k: string]: string } = {};
    for (const routeProps of this.props.routes) {
      if (routeProps.requiredScope) {
        for (const path of routeProps.paths) {
          scopeConfig[`^${path}$`] = routeProps.requiredScope;
        }
      }
    }

    // Auth Lambda
    const authLambda = new lambdaNodeJs.NodejsFunction(
      this,
      `${this.props.prefix}${this.props.name}-authoriser`,
      {
        functionName: `${this.props.prefix}${this.props.name}-authoriser`,

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
          PERSONA_CLIENT_NAME: `${this.props.prefix}${this.props.name}-authoriser`,
          PERSONA_HOST: this.props.persona.host,
          PERSONA_SCHEME: this.props.persona.scheme,
          PERSONA_PORT: this.props.persona.port,
          PERSONA_OAUTH_ROUTE: this.props.persona.oauth_route,
          SCOPE_CONFIG: JSON.stringify(scopeConfig),
        },

        awsSdkConnectionReuse: true,
        runtime: lambda.Runtime.NODEJS_14_X,
        timeout: cdk.Duration.minutes(2),
        securityGroups: this.props.securityGroups,
        vpc: this.props.vpc,
        vpcSubnets: this.props.vpcSubnets,
      }
    );

    this.authorizer = new authorizers.HttpLambdaAuthorizer(
      "lambda-authorizer",
      authLambda,
      {
        authorizerName: `${this.props.prefix}${this.props.name}-http-lambda-authoriser`,
        responseTypes: [authorizers.HttpLambdaResponseType.SIMPLE], // Define if returns simple and/or iam response
      }
    );

    for (const routeProps of this.props.routes) {
      this.addLambdaRoute(routeProps);
    }

    // Add a cloudwatch alarm for the latency of the api - this is all routes within the api
    const latencyThreshold = this.props.apiLatencyAlarmThreshold
      ? this.props.apiLatencyAlarmThreshold
      : DEFAULT_API_LATENCY_THRESHOLD;
    const metricLatency = this.httpApi
      .metricLatency()
      .with({ statistic: "average", period: cdk.Duration.minutes(1) });

    const routeLatencyAlarm = new cloudwatch.Alarm(
      this,
      `${this.props.prefix}${this.props.name}-latency-alarm`,
      {
        alarmName: `${this.props.prefix}${this.props.name}-latency-alarm`,
        alarmDescription: `Alarm if latency on api ${this.props.prefix}${
          this.props.name
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

  addLambdaRoute(routeProps: RouteLambdaProps) {
    const integration = new integrations.HttpLambdaIntegration(
      "http-lambda-integration",
      routeProps.lambda
    );

    for (const path of routeProps.paths) {
      if (routeProps.isPublic === true) {
        this.httpApi.addRoutes({
          path: path,
          methods: [routeProps.method],
          integration,
        });
      } else {
        this.httpApi.addRoutes({
          path: path,
          methods: [routeProps.method],
          integration,
          authorizer: this.authorizer,
        });
      }
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
      `${this.props.prefix}${this.props.name}-${routeProps.name}-duration-alarm`,
      {
        alarmName: `${this.props.prefix}${this.props.name}-${routeProps.name}-duration-alarm`,
        alarmDescription: `Alarm if duration of lambda for route ${
          this.props.prefix
        }${this.props.name}-${
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
      `${this.props.prefix}${this.props.name}-${routeProps.name}-errors-alarm`,
      {
        alarmName: `${this.props.prefix}${this.props.name}-${routeProps.name}-errors-alarm`,
        alarmDescription: `Alarm if errors on api ${this.props.prefix}${this.props.name}-${routeProps.name}`,
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
