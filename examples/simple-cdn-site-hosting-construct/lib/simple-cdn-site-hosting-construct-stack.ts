import * as cdk from "aws-cdk-lib";
import { aws_s3_deployment as s3deploy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";

import {
  CdnSiteHostingConstruct,
  CdnSiteHostingWithDnsConstruct,
} from "../../../lib";

export const STAGING_TALIS_IO_TLS_CERT_ARN =
  "arn:aws:acm:us-east-1:302477901552:certificate/2c1d71da-2bb8-421d-abf8-6db2b48e689d";

export class SimpleCdnSiteHostingConstructStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use AWS_PREFIX to give all resources in this sample
    // a unique name. This is usually `development-xx` where xx are your initials.
    // If you do not set AWS_PREFIX, when you deploy this stack, it may conflict
    // with someone elses stack who has also not set AWS_PREFIX
    const prefix = process.env.AWS_PREFIX
      ? process.env.AWS_PREFIX
      : "development-xx-";

    // Create a site without setting DNS
    /* const cdnSiteHostingConstruct = */ new CdnSiteHostingConstruct(
      this,
      `${prefix}CdnSiteHostingConstruct`,
      {
        domainName: "talis.io",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        // siteDomain: This would be the watermarked domain name e.g. elevate-20231025 from https://elevate-20231025.talis.com
        siteSubDomain: `${prefix}cdn-site-hosting-construct`,
        // aliasSubDomains: The production stack would supply this alias, e.g. elevate.talis.com
        aliasSubDomains: [`${prefix}cdn-site-hosting-construct-alias`],
        sources: [
          s3deploy.Source.asset(path.resolve(__dirname, "./static-site")),
        ],
        websiteIndexDocument: "index.html",
        certificateArn: STAGING_TALIS_IO_TLS_CERT_ARN,
      },
    );

    // Create a site with DNS
    /* const cdnSiteHostingWithDnsConstruct = */ new CdnSiteHostingWithDnsConstruct(
      this,
      `${prefix}CdnSiteHostingWithDnsConstruct`,
      {
        domainName: "talis.io",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        // siteSubDomain: This would be the watermarked domain name e.g. elevate-20231025 from https://elevate-20231025.talis.com
        siteSubDomain: `${prefix}cdn-site-hosting-with-dns-construct`,
        // aliasSubDomains: The production stack would supply this alias, e.g. elevate.talis.com
        aliasSubDomains: [`${prefix}cdn-site-hosting-with-dns-construct-alias`],
        sources: [
          s3deploy.Source.asset(path.resolve(__dirname, "./static-site")),
        ],
        websiteIndexDocument: "index.html",
        certificateArn: STAGING_TALIS_IO_TLS_CERT_ARN,
      },
    );
  }
}
