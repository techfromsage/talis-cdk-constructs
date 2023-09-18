import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';

export const CfnTableProperties: dynamodb.CfnTableProps = {
  keySchema: [
    {
      attributeName: "attributeName",
      keyType: "keyType",
    },
  ],

  // the properties below are optional
  attributeDefinitions: [
    {
      attributeName: "attributeName",
      attributeType: "attributeType",
    },
  ],
  billingMode: "billingMode",
  contributorInsightsSpecification: {
    enabled: false,
  },
  globalSecondaryIndexes: [
    {
      indexName: "indexName",
      keySchema: [
        {
          attributeName: "attributeName",
          keyType: "keyType",
        },
      ],
      projection: {
        nonKeyAttributes: ["nonKeyAttributes"],
        projectionType: "projectionType",
      },

      // the properties below are optional
      contributorInsightsSpecification: {
        enabled: false,
      },
      provisionedThroughput: {
        readCapacityUnits: 123,
        writeCapacityUnits: 123,
      },
    },
  ],
  kinesisStreamSpecification: {
    streamArn: "streamArn",
  },
  localSecondaryIndexes: [
    {
      indexName: "indexName",
      keySchema: [
        {
          attributeName: "attributeName",
          keyType: "keyType",
        },
      ],
      projection: {
        nonKeyAttributes: ["nonKeyAttributes"],
        projectionType: "projectionType",
      },
    },
  ],
  pointInTimeRecoverySpecification: {
    pointInTimeRecoveryEnabled: false,
  },
  provisionedThroughput: {
    readCapacityUnits: 123,
    writeCapacityUnits: 123,
  },
  sseSpecification: {
    sseEnabled: false,

    // the properties below are optional
    kmsMasterKeyId: "kmsMasterKeyId",
    sseType: "sseType",
  },
  streamSpecification: {
    streamViewType: "streamViewType",
  },
  tableName: "tableName",
  tags: [
    {
      key: "key",
      value: "value",
    },
  ],
  timeToLiveSpecification: {
    attributeName: "attributeName",
    enabled: false,
  },
};
