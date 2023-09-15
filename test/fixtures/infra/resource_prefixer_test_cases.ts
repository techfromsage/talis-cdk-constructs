import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import * as apigatewayv2_alpha from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { Constructor } from "../../../lib";

export type ResourcePrefixerTestCase = {
  resourceType: Constructor<Construct>;
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
    resourceType: apigatewayv2_alpha.HttpApi,
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
