import { CfnTable } from "@aws-cdk/aws-dynamodb";
import { IConstruct } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class DynamoDbCfnTablePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (!(node instanceof CfnTable)) {
      throw new Error(
        "Specified node is not an instance of CfnTable and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const table = this.node as CfnTable;
    this.prefixResourceName(table.tableName, "TableName");
  }
}
