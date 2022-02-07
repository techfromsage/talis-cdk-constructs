import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import { Constructor } from "../../../lib";

export type ResourcePrefixerTestCase = {
  resourceType: Constructor<cdk.Construct>;
  resourceProps: Record<string, unknown>;
  expectedType: string;
  expectedPropsUnprefixed: Record<string, unknown>;
  expectedPropsPrefixed: Record<string, unknown>;
};

export const ResourcePrefixerTestCases: Array<ResourcePrefixerTestCase> = [
  {
    resourceType: dynamodb.Table,
    resourceProps: {
      tableName: "tableName",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    },
    expectedType: "AWS::DynamoDB::Table",
    expectedPropsUnprefixed: {
      TableName: "tableName",
    },
    expectedPropsPrefixed: {
      TableName: "test-prefix-tableName",
    },
  },
  {
    resourceType: apigatewayv2.HttpApi,
    resourceProps: {
      apiName: "api-name",
    },
    expectedType: "AWS::ApiGatewayV2::Api",
    expectedPropsUnprefixed: {
      Name: "api-name",
    },
    expectedPropsPrefixed: {
      Name: "test-prefix-api-name",
    },
  },
];
