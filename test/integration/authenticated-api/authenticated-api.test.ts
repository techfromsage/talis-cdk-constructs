import axios from "axios";
import { ApiGatewayV2 } from "aws-sdk";

const api = new ApiGatewayV2();

const TALIS_CDK_AUTH_API_MISSING_SCOPE_CLIENT =
  process.env.TALIS_CDK_AUTH_API_MISSING_SCOPE_CLIENT ?? "";
const TALIS_CDK_AUTH_API_MISSING_SCOPE_SECRET =
  process.env.TALIS_CDK_AUTH_API_MISSING_SCOPE_SECRET ?? "";
const TALIS_CDK_AUTH_API_VALID_CLIENT =
  process.env.TALIS_CDK_AUTH_API_VALID_CLIENT ?? "";
const TALIS_CDK_AUTH_API_VALID_SECRET =
  process.env.TALIS_CDK_AUTH_API_VALID_SECRET ?? "";

describe("AuthenticatedApi", () => {
  // Increase the timeout We are making http calls which might have to spin up a cold lambda
  jest.setTimeout(30000);

  let apiGatewayId: string;

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

  async function getOAuthToken(
    client: string,
    secret: string
  ): Promise<string> {
    const postData = "grant_type=client_credentials";
    const response = await axios.post(
      "https://staging-users.talis.com/oauth/tokens",
      postData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": `${postData.length}`,
        },
        auth: {
          username: client,
          password: secret,
        },
      }
    );

    return response.data.access_token;
  }

  beforeAll(async () => {
    apiGatewayId = await findApiGatewayId();
  });

  test("returns 200 for unauthenticated route", async () => {
    const axiosNoAuthInstance = axios.create({
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
    });
    const response = await axiosNoAuthInstance.get("route2");
    expect(response.status).toBe(200);
    expect(response.data).toBe("route 2");
  });

  test("returns 401 for authenticated route", async () => {
    try {
      const axiosNoAuthInstance = axios.create({
        baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
      });
      await axiosNoAuthInstance.get("route1");
      throw Error("Expected a 401 response");
    } catch (err) {
      expect(err.message).toBe("Request failed with status code 401");
    }
  });

  test("returns 403 when token does not have required scope", async () => {
    const token = await getOAuthToken(
      TALIS_CDK_AUTH_API_MISSING_SCOPE_CLIENT,
      TALIS_CDK_AUTH_API_MISSING_SCOPE_SECRET
    );
    try {
      const axiosBadAuthInstance = axios.create({
        headers: { Authorization: `Bearer ${token}` },
        baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
      });
      await axiosBadAuthInstance.get("route1");
      throw Error("Expected a 403 response");
    } catch (err) {
      expect(err.message).toBe("Request failed with status code 403");
    }
  });

  test("returns 200 when authorised", async () => {
    const token = await getOAuthToken(
      TALIS_CDK_AUTH_API_VALID_CLIENT,
      TALIS_CDK_AUTH_API_VALID_SECRET
    );
    const axiosAuthInstance = axios.create({
      headers: { Authorization: `Bearer ${token}` },
      baseURL: `https://${apiGatewayId}.execute-api.eu-west-1.amazonaws.com/1/`,
    });
    const response = await axiosAuthInstance.get("route1");
    expect(response.status).toBe(200);
    expect(response.data).toBe("route 1");
  });
});
