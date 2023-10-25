import axios from "axios";
import { AxiosError } from "axios";
import { CloudFront } from "aws-sdk";

async function assertWebsiteCreated(url: string, content: string) {
  const response = await axios.get(url);
  expect(response.status).toBe(200);
  expect(response.data).toContain(content);
}

async function assertWebsiteDoesNotExist(url: string, content: string) {
  try {
    await axios.get(url);
    fail("Expected to fail");
  } catch (err: any | AxiosError) {
    if (axios.isAxiosError(err)) {
      expect(err.message).toBe(
        `getaddrinfo ENOTFOUND ${process.env.AWS_PREFIX}cdn-site-hosting-construct.talis.io`,
      );
    } else {
      throw err;
    }
  }
}

async function findCloudfrontDistributionDomainName(
  name: string,
): Promise<string> {
  const client = new CloudFront();
  const response = await client.listDistributions().promise();

  if (!response.DistributionList?.Items) {
    throw Error("Distribution not found");
  }

  for (const distribution of response.DistributionList.Items) {
    if (distribution.Aliases.Items?.includes(name)) {
      return distribution.DomainName;
    }
  }

  throw Error("Distribution not found");
}

// These integration tests run against the simple cdn site hosting construct example, deployed in AWS
// The example contains two cdn hosted websites, one with DNS and one without

describe("CdnSiteHostingConstruct with no DNS", () => {
  test("successfully creates static website at cloudfront distribution domain name", async () => {
    const domainName = await findCloudfrontDistributionDomainName(
      `${process.env.AWS_PREFIX}cdn-site-hosting-construct.talis.io`,
    );
    await assertWebsiteCreated(`https://${domainName}`, "Test Deployment");
  });

  test("does not create static website accessable at alias", async () => {
    const domainName = `${process.env.AWS_PREFIX}cdn-site-hosting-construct.talis.io`;
    await assertWebsiteDoesNotExist(`https://${domainName}`, "Test Deployment");
  });
});

describe("CdnSiteHostingWithDnsConstruct", () => {
  test("successfully creates static website at cloudfront distribution domain name", async () => {
    const domainName = await findCloudfrontDistributionDomainName(
      `${process.env.AWS_PREFIX}cdn-site-hosting-with-dns-construct.talis.io`,
    );
    await assertWebsiteCreated(`https://${domainName}`, "Test Deployment");
  });

  test("successfully creates static website accessable at alias", async () => {
    const domainName = `${process.env.AWS_PREFIX}cdn-site-hosting-with-dns-construct.talis.io`;
    await assertWebsiteCreated(`https://${domainName}`, "Test Deployment");
  });
});
