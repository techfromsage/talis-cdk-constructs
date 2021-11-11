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

import { AuthenticatedApi } from "../../lib";

describe("AuthenticatedApi", () => {
  describe("with only required props", () => {
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
        name: "MyTestAuthenticatedApi",
        description: "A simple example API",
        stageName: "development", // This should be development / staging / production as appropriate
        alarmTopic,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },

        persona: {
          host: "staging-users.talis.com",
          scheme: "https",
          port: "443",
          oauth_route: "/oauth/tokens/",
        },

        routes: [
          {
            name: "route1",
            paths: ["/1/test-route-1"],
            method: apigatewayv2.HttpMethod.GET,
            lambdaProps: {
              entry: `${path.resolve(__dirname)}/routes/route1.js`,
              handler: "route",
              timeout: cdk.Duration.seconds(30),
            },
          },
          {
            name: "route2",
            paths: ["/1/test-route-2"],
            method: apigatewayv2.HttpMethod.GET,
            lambdaProps: {
              entry: `${path.resolve(__dirname)}/routes/route2.js`,
              handler: "route",
              timeout: cdk.Duration.seconds(30),
            },
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
          FunctionName: "test-MyTestAuthenticatedApi-route1",
          Timeout: 30,
          Handler: "index.route",
          Runtime: "nodejs14.x",
          Environment: {
            Variables: {
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
        })
      );

      expectCDK(stack).to(
        haveResourceLike("AWS::Lambda::Function", {
          FunctionName: "test-MyTestAuthenticatedApi-route2",
          Timeout: 30,
          Handler: "index.route",
          Runtime: "nodejs14.x",
          Environment: {
            Variables: {
              AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            },
          },
        })
      );
    });

    test("provisions three alarms", () => {
      expectCDK(stack).to(countResources("AWS::CloudWatch::Alarm", 3));
    });

    test("provisions alarm to warn of latency on the api", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-latency-alarm",
          AlarmDescription:
            "Alarm if latency on api MyTestAuthenticatedApi exceeds 60000 milliseconds",
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
          Statistic: "Sum",
          Threshold: 60000,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });

    test("provisions alarm to warn of latency on the api", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-latency-alarm",
          AlarmDescription:
            "Alarm if latency on api MyTestAuthenticatedApi exceeds 60000 milliseconds",
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
          Statistic: "Sum",
          Threshold: 60000,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
          TreatMissingData: "ignore",
          OKActions: [{ Ref: "TestAlarm5A9EF6BD" }],
        })
      );
    });

    test("provisions alarms on latency of lambda's", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudWatch::Alarm", {
          AlarmName: "test-MyTestAuthenticatedApi-route1-duration-alarm",
          AlarmDescription:
            "Alarm if duration of lambda for route MyTestAuthenticatedApi-route1 exceeds duration 60000 milliseconds",
          Namespace: "AWS/Lambda",
          MetricName: "Duration",
          Dimensions: [
            {
              Name: "FunctionName",
              Value: {
                Ref: "MyTestAuthenticatedApitestroute12C3166DA",
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
            "Alarm if duration of lambda for route MyTestAuthenticatedApi-route2 exceeds duration 60000 milliseconds",
          Namespace: "AWS/Lambda",
          MetricName: "Duration",
          Dimensions: [
            {
              Name: "FunctionName",
              Value: {
                Ref: "MyTestAuthenticatedApitestroute279F05FB4",
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
  });
});
