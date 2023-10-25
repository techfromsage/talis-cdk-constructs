import axios from "axios";
import { CloudFront } from "aws-sdk";

describe("CdnSiteHostingConstruct", () => {
  async function assertWebsiteCreated(url: string, content: string) {
    const response = await axios.get(url);
    expect(response.status).toBe(200);
    expect(response.data).toContain(content);
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
        // console.log(`Found for name ${name}`);
        // console.log(JSON.stringify(distribution.Aliases.Items));
        return distribution.DomainName;
      }
    }

    throw Error("Distribution not found");
  }

  test("successfully hosts static website without dns name at cloudfront distribution", async () => {
    const domainName = await findCloudfrontDistributionDomainName(`${process.env.AWS_PREFIX}cdn-site-hosting-construct.talis.io`);
    await assertWebsiteCreated(
      `https://${domainName}`,
      'Test Deployment'
    );
  });

  test("successfully hosts static website with dns name at cloudfront domain name", async () => {
    const domainName = await findCloudfrontDistributionDomainName(`${process.env.AWS_PREFIX}cdn-site-hosting-with-dns-construct.talis.io`);
    await assertWebsiteCreated(
      `https://${domainName}`,
      'Test Deployment'
    );
  });

  test("successfully hosts static website with dns name at given address", async () => {
    await assertWebsiteCreated(
      `https://${process.env.AWS_PREFIX}cdn-site-hosting-with-dns-construct.talis.io`,
      'Test Deployment'
    );
  });
});
