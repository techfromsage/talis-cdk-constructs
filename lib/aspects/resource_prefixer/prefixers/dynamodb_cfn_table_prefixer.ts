import { CfnTable } from "@aws-cdk/aws-dynamodb";
import { IConstruct } from "@aws-cdk/core";
import { CfnResourcePrefixer } from "../cfn_resource_prefixer";

export class DynamoDbCfnTablePrefixer implements CfnResourcePrefixer {
  private node: CfnTable;
  private resourcePrefix: string;

  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnTable)) {
      throw new Error(
        "Specified node is not an instance of CfnTable and cannot be prefixed using this prefixer"
      );
    }
    this.node = node;
    this.resourcePrefix = resourcePrefix;
  }

  public prefix(): void {
    this.node.addPropertyOverride(
      "TableName",
      `${this.resourcePrefix}${this.node.tableName}`
    );
  }
}
