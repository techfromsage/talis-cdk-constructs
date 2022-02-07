import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
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

      expectCDK(stack).to(
        haveResource("AWS::DynamoDB::Table", {
          TableName: "tableName",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the table name", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::DynamoDB::Table", {
          TableName: "test-prefix-tableName",
        })
      );
    });
    test.todo("Truncates the table name if too long");
  });

  describe("Undefined Resource", () => {
    test("Raises error if no prefixer defined for resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });

      expect(() => {
        new DynamoDbCfnTablePrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnTable and cannot be prefixed using this prefixer"
      );
    });
  });
});
