import * as cdk from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
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
        (node as cdk.CfnResource).cfnResourceType ===
        dynamodb.CfnTable.CFN_RESOURCE_TYPE_NAME
      )
    ) {
      cdk.Annotations.of(node).addError(
        "Node is not a CfnTable and cannot be prefixed using this prefixer"
      );
    }
    super(node, resourcePrefix);
  }

  public prefix(): void {
    const table = this.node as dynamodb.CfnTable;
    this.prefixResourceName(table.tableName, "TableName");
  }
}
