/* const AWS = require("aws-sdk"); */
import axios, { AxiosInstance } from "axios";
import { ApiGatewayV2 } from "aws-sdk";

const api = new ApiGatewayV2();

describe("AuthenticatedApi", () => {
  let apiGatewayId: string;

  let axiosNoAuthInstance: AxiosInstance;
  let axiosBadAuthInstance: AxiosInstance;
  let axiosAuthInstance: AxiosInstance;

  async function findApiGatewayId(
    nextToken: string | undefined = undefined
  ): Promise<string> {
    const response = await api.getApis({ NextToken: nextToken }).promise();

    if (!response.Items) {
      throw Error("ApiGateway not found");
    }

    for (const item of response.Items) {
      if (
        item.Name === `${process.env.AWS_PREFIX}simple-authenticated-api` &&
        item.ApiId
      ) {
        return item.ApiId;
      }
    }

    console.log(`Response NextToken : ${JSON.stringify(response.NextToken)}`);
    if (response.NextToken) {
      return await findApiGatewayId(response.NextToken);
    }

    throw Error("ApiGateway not found");
  }

  beforeAll(async () => {
    apiGatewayId = await findApiGatewayId();
    axiosNoAuthInstance = axios.create({
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
    });
    axiosBadAuthInstance = axios.create({
      headers: { Authorization: "Bearer badtoken" },
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
    });
    axiosAuthInstance = axios.create({
      headers: { Authorization: "Bearer todo - get token" },
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
    });
  });

  test("returns 200 for unauthenticated route", async () => {
    const response = await axiosNoAuthInstance.get("route2");
    expect(response.status).toBe(200);
    expect(response.data).toBe("route 2");
  });

  test("returns 401 for authenticated route", async () => {
    try {
      await axiosNoAuthInstance.get("route1");
      throw Error("Expected a 401 response");
    } catch (err) {
      expect(err.message).toBe("Request failed with status code 401");
    }
  });

  test("returns 403 when using bad token", async () => {
    try {
      await axiosBadAuthInstance.get("route1");
      throw Error("Expected a 403 response");
    } catch (err) {
      expect(err.message).toBe("Request failed with status code 403");
    }
  });

  test("returns 200 when authorised", async () => {
    const response = await axiosAuthInstance.get("route1");
    expect(response.status).toBe(200);
    expect(response.data).toBe("route 1");
  });
});
