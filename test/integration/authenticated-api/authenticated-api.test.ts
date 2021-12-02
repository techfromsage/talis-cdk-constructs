const AWS = require('aws-sdk');
import axios, { AxiosInstance } from "axios";

const api = new AWS.ApiGatewayV2();

describe("AuthenticatedApi", () => {
  
  let apiGatewayId: String;
  let axiosInstance: AxiosInstance;

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

  beforeAll( async () => {
    apiGatewayId = await findApiGatewayId();
    axiosInstance = axios.create({
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`
    });
  });

  test("returns 200 for unauthenticated route", async () => {
    const response = await axiosInstance.get('route2');
    expect(response.status).toBe(200);
    expect(response.data).toBe('route 2');
  });

  test("returns 401 for authenticated route", async () => {
    try {
      await axiosInstance.get('route1');
      throw Error('Expected a 401 response');
    } catch (err) {
      expect(err.message).toBe('Request failed with status code 401');
    }
  });
});
