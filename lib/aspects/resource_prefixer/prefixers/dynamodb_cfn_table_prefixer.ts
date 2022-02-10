import { CfnTable } from "@aws-cdk/aws-dynamodb";
import { IConstruct, CfnResource, Annotations } from "@aws-cdk/core";
import {
  CfnResourcePrefixer,
  CfnResourcePrefixerBase,
} from "../cfn_resource_prefixer";

export class DynamoDbCfnTablePrefixer
  extends CfnResourcePrefixerBase
  implements CfnResourcePrefixer
{
  constructor(node: IConstruct, resourcePrefix: string) {
    if (
      !(
        (node as CfnResource).cfnResourceType ===
        CfnTable.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      Annotations.of(node).addError(
        "Node is not a CfnTable and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const table = this.node as CfnTable;
    this.prefixResourceName(table.tableName, "TableName");
  }
}
