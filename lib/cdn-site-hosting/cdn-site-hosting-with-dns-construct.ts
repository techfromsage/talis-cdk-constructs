import * as cdk from "@aws-cdk/core";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets/lib";
import { CdnSiteHostingConstruct } from "./cdn-site-hosting-construct";
import { getSiteDomain } from "./utils";
import { CommonCdnSiteHostingProps } from "./cdn-site-hosting-props";

export type CdnSiteHostingWithDnsConstructProps = CommonCdnSiteHostingProps;

/**
 * Establishes infrastructure to host a static-site or single-page-application in S3 via CloudFront,
 * with DNS record provisioning
 *
 * This construct will:
 * - Create a Route 53 entry for the specified site domain
 * - Generate a new TLS certificate for the newly-created Route 53 domain
 * - Delegate underlying infrastructure and code deployment to `cdnSiteHostingConstruct`
 * - Associate the DNS entry with the underpinning CloudFront distribution
 */
export class CdnSiteHostingWithDnsConstruct extends cdk.Construct {
  public readonly cdnSiteHosting: CdnSiteHostingConstruct;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: CdnSiteHostingWithDnsConstructProps
  ) {
    super(scope, id);

    const siteDomain = getSiteDomain(props);

    // Create the route 53 zone
    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: props.domainName,
    });
    new cdk.CfnOutput(this, "Site", { value: `https://${siteDomain}` });

    // Create a new TLS certificate - it has to be in `us-east-1`
    const certificateArn = new certificatemanager.DnsValidatedCertificate(
      this,
      "SiteCertificate",
      {
        domainName: siteDomain,
        hostedZone: zone,
        region: "us-east-1", // Cloudfront only checks this region for certificates.
      }
    ).certificateArn;
    new cdk.CfnOutput(this, "Certificate", { value: certificateArn });

    // Create the underpinning hosting infrastructure
    this.cdnSiteHosting = new CdnSiteHostingConstruct(this, id, {
      ...props,
      certificateArn,
    });

    // Create a Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, `${siteDomain}-SiteAliasRecord`, {
      recordName: siteDomain,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(
          this.cdnSiteHosting.cloudfrontWebDistribution
        )
      ),
      zone,
    });
  }
}
