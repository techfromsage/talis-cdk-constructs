import {
  expect as expectCDK,
  countResources,
  haveResource,
  haveResourceLike,
} from "@aws-cdk/assert";
import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import * as path from "path";
import * as sns from "@aws-cdk/aws-sns";

import { AuthenticatedApi, AuthenticatedApiFunction } from "../../../lib";

describe("AuthenticatedApi", () => {
  describe("with lambda routes", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });
      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      // Create the lambda's to be passed into the AuthenticatedApi construct
      const route1Handler = new AuthenticatedApiFunction(
        stack,
        `test-simple-authenticated-api-route1-handler`,
        {
          name: `test-route1-handler`,
          entry: `${path.resolve(__dirname)}/routes/route1.js`,
          environment: {},
          handler: "route",
          timeout: cdk.Duration.seconds(30),
          securityGroups: [],
          vpc: vpc,
        }
      );

      const route2Handler = new AuthenticatedApiFunction(
        stack,
        `test-simple-authenticated-api-route2-handler`,
        {
          name: `test-route2-handler`,
          entry: `${path.resolve(__dirname)}/routes/route2.js`,
          environment: {},
          handler: "route",
          timeout: cdk.Duration.seconds(30),
          securityGroups: [],
          vpc: vpc,
        }
      );

      new AuthenticatedApi(stack, "MyTestAuthenticatedApi", {
        prefix: `test-`,
        name: "MyTestAuthenticatedApi",
        description: "A simple example API",
        stageName: "development", // This should be development / staging / production as appropriate
        alarmTopic,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        domainName: `test-simple-authenticated-api.talis.com`,
        certificateArn:
          "arn:aws:acm:eu-west-1:302477901552:certificate/46e0fb43-bba8-4aa7-bf98-a3b2038cf760",
        corsDomain: [
          "http://localhost:4200",
          `https://test-simple-authenticated-api.talis.com`,
        ],

        persona: {
          host: "staging-users.talis.com",
          scheme: "https",
          port: "443",
          oauth_route: "/oauth/tokens/",
        },

        lambdaRoutes: [
          {
            name: "route1",
            path: "/1/test-route-1",
            method: apigatewayv2.HttpMethod.GET,
            lambda: route1Handler,
          },
          {
            name: "route2",
            path: "/1/test-route-2",
            method: apigatewayv2.HttpMethod.GET,
            lambda: route2Handler,
            isPublic: true,
          },
        ],
      });
    });

    test("provisions an api", () => {
      expectCDK(stack).to(countResources("AWS::ApiGatewayV2::Api", 1));

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Api", {
          Name: "test-MyTestAuthenticatedApi",
          ProtocolType: "HTTP",
        })
      );
    });

    test("provisions routes", () => {
      expectCDK(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Route", {
          RouteKey: "GET /1/test-route-1",
          AuthorizationType: "CUSTOM",
        })
      );
      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Route", {
          RouteKey: "GET /1/test-route-2",
          AuthorizationType: "NONE",
        })
      );
    });

    test("provisions authorizer lambda", () => {
      expectCDK(stack).to(countResources("AWS::Lambda::Function", 3));

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "test-MyTestAuthenticatedApi-authoriser",
          Timeout: 120,
          Handler: "index.validateToken",
          Runtime: "nodejs14.x",
          Environment: {
            Variables: {
              PERSONA_CLIENT_NAME: "test-MyTestAuthenticatedApi-authoriser",
              PERSONA_HOST: "staging-users.talis.com",
              PERSONA_SCHEME: "https",
              PERSONA_PORT: "443",
              PERSONA_OAUTH_ROUTE: "/oauth/tokens/",
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
        })
      );
    });

    test("provisions lambdas for the routes", () => {
      expectCDK(stack).to(countResources("AWS::Lambda::Function", 3));
      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "test-route1-handler",
          Timeout: 30,
          Handler: "index.route",
          Runtime: "nodejs14.x",
          Environment: {},
        })
      );

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "test-route2-handler",
          Timeout: 30,
          Handler: "index.route",
          Runtime: "nodejs14.x",
          Environment: {},
        })
      );
    });

    test("provisions five alarms", () => {
      expectCDK(stack).to(countResources("AWS::CloudWatch::Alarm", 5));
    });

    test("provisions alarm to warn of latency on the api", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-latency-alarm",
          AlarmDescription:
            "Alarm if latency on api test-MyTestAuthenticatedApi exceeds 60000 milliseconds",
          Namespace: "AWS/ApiGateway",
          MetricName: "Latency",
          Dimensions: [
            {
              Name: "ApiId",
              Value: {
                Ref: "MyTestAuthenticatedApitestMyTestAuthenticatedApi09BBF2A7",
              },
            },
          ],
          Period: 60,
          Statistic: "Average",
          Threshold: 60000,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });

    test("provisions alarms on duration of lambda's", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-route1-duration-alarm",
          AlarmDescription:
            "Alarm if duration of lambda for route test-MyTestAuthenticatedApi-route1 exceeds duration 60000 milliseconds",
          Namespace: "AWS/Lambda",
          MetricName: "Duration",
          Dimensions: [
            {
              Name: "FunctionName",
              Value: {
                Ref: "testsimpleauthenticatedapiroute1handler9C009052",
              },
            },
          ],
          Period: 60,
          Statistic: "Sum",
          Threshold: 60000,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );

      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-route2-duration-alarm",
          AlarmDescription:
            "Alarm if duration of lambda for route test-MyTestAuthenticatedApi-route2 exceeds duration 60000 milliseconds",
          Namespace: "AWS/Lambda",
          MetricName: "Duration",
          Dimensions: [
            {
              Name: "FunctionName",
              Value: {
                Ref: "testsimpleauthenticatedapiroute2handlerA618DED6",
              },
            },
          ],
          Period: 60,
          Statistic: "Sum",
          Threshold: 60000,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });

    test("provisions alarms on errors of lambda's", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-route1-errors-alarm",
          AlarmDescription:
            "Alarm if errors on api test-MyTestAuthenticatedApi-route1",
          Namespace: "AWS/Lambda",
          MetricName: "Errors",
          Dimensions: [
            {
              Name: "FunctionName",
              Value: {
                Ref: "testsimpleauthenticatedapiroute1handler9C009052",
              },
            },
          ],
          Period: 60,
          Statistic: "Sum",
          Threshold: 1,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );

      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-route2-errors-alarm",
          AlarmDescription:
            "Alarm if errors on api test-MyTestAuthenticatedApi-route2",
          Namespace: "AWS/Lambda",
          MetricName: "Errors",
          Dimensions: [
            {
              Name: "FunctionName",
              Value: {
                Ref: "testsimpleauthenticatedapiroute2handlerA618DED6",
              },
            },
          ],
          Period: 60,
          Statistic: "Sum",
          Threshold: 1,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });
  });
  describe("with url routes", () => {
    let stack: cdk.Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack");
      const alarmTopic = new sns.Topic(stack, "TestAlarm", {
        topicName: "TestAlarm",
      });
      const vpc = new ec2.Vpc(stack, "TheVPC", {
        cidr: "10.0.0.0/16",
      });

      new AuthenticatedApi(stack, "MyTestAuthenticatedApi", {
        prefix: `test-`,
        name: "MyTestAuthenticatedApiWithUrlRoutes",
        description: "A simple example API",
        stageName: "development", // This should be development / staging / production as appropriate
        alarmTopic,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        domainName: `test-simple-authenticated-api.talis.com`,
        certificateArn:
          "arn:aws:acm:eu-west-1:302477901552:certificate/46e0fb43-bba8-4aa7-bf98-a3b2038cf760",
        corsDomain: [
          "http://localhost:4200",
          `https://test-simple-authenticated-api.talis.com`,
        ],

        persona: {
          host: "staging-users.talis.com",
          scheme: "https",
          port: "443",
          oauth_route: "/oauth/tokens/",
        },

        urlRoutes: [
          {
            name: "route1",
            baseUrl: "https://www.example.com",
            path: "/api/index.html",
            method: apigatewayv2.HttpMethod.GET,
          },
          {
            name: "route2",
            baseUrl: "https://www.example.com",
            path: "/docs/index.html",
            method: apigatewayv2.HttpMethod.GET,
          },
        ],
      });
    });

    test("provisions routes", () => {
      expectCDK(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Route", {
          RouteKey: "GET /api/index.html",
          AuthorizationType: "NONE",
        })
      );
      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Route", {
          RouteKey: "GET /docs/index.html",
          AuthorizationType: "NONE",
        })
      );
    });
  });
});
