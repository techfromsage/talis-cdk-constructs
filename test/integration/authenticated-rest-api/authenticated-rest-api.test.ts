import axios from "axios";
import { ApiGatewayV2 } from "aws-sdk";

const api = new ApiGatewayV2();

describe("AuthenticatedRestApi", () => {
  // Increase the timeout We are making http calls which might have to spin up a cold lambda
  jest.setTimeout(30000);

  let apiGatewayId: string;

  async function findApiGatewayId(
    nextToken: string | undefined = undefined,
  ): Promise<string> {
    const response = await api.getApis({ NextToken: nextToken }).promise();

    if (!response.Items) {
      throw Error("ApiGateway not found");
    }

    for (const item of response.Items) {
      if (
        item.Name ===
          `${process.env.AWS_PREFIX}simple-authenticated-rest-api` &&
        item.ApiId
      ) {
        return item.ApiId;
      }
    }

    if (response.NextToken) {
      return await findApiGatewayId(response.NextToken);
    }

    throw Error("ApiGateway not found");
  }

  beforeAll(async () => {
    apiGatewayId = await findApiGatewayId();
  });

  test("returns 200 for unauthenticated route", async () => {
    const axiosNoAuthInstance = axios.create({
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/`,
    });
    const response = await axiosNoAuthInstance.get("simple-resource");
    expect(response.status).toBe(200);
    expect(response.data).toBe("route 1");
  });
});
