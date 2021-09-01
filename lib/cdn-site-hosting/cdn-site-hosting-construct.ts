import * as cdk from "@aws-cdk/core";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { getSiteDomain } from "./utils";
import { RemovalPolicy } from "@aws-cdk/core";

export interface CdnSiteHostingConstructProps {
  certificateArn: string;
  domainName: string;
  removalPolicy: cdk.RemovalPolicy;
  siteSubDomain: string;
  sources: s3deploy.ISource[];
  websiteErrorDocument: string;
  websiteIndexDocument: string;
}

/**
 * Establishes infrastructure to host a static-site or single-page-application in S3 via CloudFront.
 *
 * This construct will:
 * - Create an S3 bucket with static website hosting enabled
 * - Create a CloudFront web distribution to deliver site content
 * - Register the CloudFront distribution with the provided certificate
 * - Deploy provided source code to S3 and invalidate the CloudFront distribution
 */
export class CdnSiteHostingConstruct extends cdk.Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly cloudfrontWebDistribution: cloudfront.CloudFrontWebDistribution;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: CdnSiteHostingConstructProps
  ) {
    super(scope, id);

    const siteDomain = getSiteDomain(props);

    // certificate
    const viewerCertificate = cloudfront.ViewerCertificate.fromAcmCertificate(
      certificatemanager.Certificate.fromCertificateArn(
        this,
        `${siteDomain}-cert`,
        props.certificateArn
      ),
      {
        aliases: [siteDomain],
        sslMethod: cloudfront.SSLMethod.SNI,
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
      }
    );

    // S3 bucket
    this.s3Bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: siteDomain,
      websiteIndexDocument: props.websiteIndexDocument,
      websiteErrorDocument: props.websiteErrorDocument,
      publicReadAccess: true,
      removalPolicy: props.removalPolicy,
      autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "Bucket", { value: this.s3Bucket.bucketName });

    // Cloudfront distribution
    this.cloudfrontWebDistribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "SiteDistribution",
      {
        viewerCertificate,
        originConfigs: [
          {
            // We use a custom origin rather than S3 origin because the latter
            // does not seem to support websiteErrorDocument correctly
            customOriginSource: {
              domainName: this.s3Bucket.bucketWebsiteDomainName,
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
      }
    );
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.cloudfrontWebDistribution.distributionId,
    });

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: props.sources,
      destinationBucket: this.s3Bucket,
      distribution: this.cloudfrontWebDistribution,
      distributionPaths: ["/*"],
    });
  }
}
