const AWS = require('aws-sdk');

const api = new AWS.ApiGatewayV2();

describe("AuthenticatedApi", () => {
  
  let apiGatewayId: String|null = null;

  async function findApiGatewayId(nextToken: String|null = null) : Promise<String> {
    const response = await api.getApis({ NextToken: nextToken }).promise()
    for (const item of response.Items) {
      if (item.Name === `${process.env.AWS_PREFIX}simple-authenticated-api`) {
        return item.ApiId;
      }
    }

    console.log(`Response NextToken : ${JSON.stringify(response.NextToken)}`);
    if (response.NextToken) {
      return await findApiGatewayId(response.NextToken);
    }

    throw Error('ApiGateway not found');
  }

  beforeAll(async () => {
    apiGatewayId = await findApiGatewayId();
  });

  test("returns 200 for unauthenticated route", async () => {
    expect(apiGatewayId).toBe('bob');
  });
});
