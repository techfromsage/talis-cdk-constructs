import * as cdk from "aws-cdk-lib";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import { Annotations, Template } from "aws-cdk-lib/assertions";

import { DynamoDbCfnTablePrefixer } from "../../../../lib";
import { CfnTableProperties } from "../../../fixtures/infra/aws-dynamodb/cfn_table";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("DynamoDB CfnTable Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnTable: dynamodb.CfnTable;
  let prefixer: DynamoDbCfnTablePrefixer;
  let emptyPrefixer: DynamoDbCfnTablePrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnTable = new dynamodb.CfnTable(stack, "table2", CfnTableProperties);
    prefixer = new DynamoDbCfnTablePrefixer(cfnTable, "test-prefix-");
    emptyPrefixer = new DynamoDbCfnTablePrefixer(cfnTable, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps table name the same", () => {
      emptyPrefixer.prefix();

      Template.fromStack(stack).hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "tableName",
      });
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the table name", () => {
      prefixer.prefix();

      Template.fromStack(stack).hasResourceProperties("AWS::DynamoDB::Table", {
        TableName: "test-prefix-tableName",
      });
    });
    test.todo("Truncates the table name if too long");
  });

  describe("Undefined Resource", () => {
    test("Adds error annotation if prefixer cannot be used for cloud formation resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });
      new DynamoDbCfnTablePrefixer(unknownResource, "prefix");
      Annotations.fromStack(stack).hasError(
        "/AspectTestStack/empty",
        "Node is not a CfnTable and cannot be prefixed using this prefixer",
      );
    });
  });
});
