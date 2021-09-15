import * as cdk from "@aws-cdk/core";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { getSiteDomain } from "./utils";
import { CommonCdnSiteHostingProps } from "./cdn-site-hosting-props";

export interface CdnSiteHostingConstructProps
  extends CommonCdnSiteHostingProps {
  certificateArn: string;
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

    validateProps(props);

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
      autoDeleteObjects: props.removalPolicy === cdk.RemovalPolicy.DESTROY,
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
        errorConfigurations: [
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.cloudfrontWebDistribution.distributionId,
    });

    // Deploy site contents to S3 bucket
    if (props.sourcesWithDeploymentOptions) {
      const isSingleDeploymentStep =
        props.sourcesWithDeploymentOptions.length === 1;

      // multiple sources with granular cache and invalidation control
      props.sourcesWithDeploymentOptions.forEach(
        (
          { name, sources, distributionPathsToInvalidate, cacheControl },
          index
        ) => {
          const isInvalidationRequired =
            distributionPathsToInvalidate &&
            distributionPathsToInvalidate.length > 0;

          const nameOrIndex = name ? name : `${index}`;

          new s3deploy.BucketDeployment(this, `CustomDeploy${nameOrIndex}`, {
            cacheControl,
            sources: sources,
            prune: isSingleDeploymentStep,
            destinationBucket: this.s3Bucket,
            distribution: isInvalidationRequired
              ? this.cloudfrontWebDistribution
              : undefined,
            distributionPaths: isInvalidationRequired
              ? distributionPathsToInvalidate
              : undefined,
          });
        }
      );
    } else if (props.sources) {
      // multiple sources, with default cache-control and wholesale invalidation
      new s3deploy.BucketDeployment(this, "DeployAndInvalidate", {
        sources: props.sources,
        destinationBucket: this.s3Bucket,
        distribution: this.cloudfrontWebDistribution,
        distributionPaths: ["/*"],
      });
    }
  }
}

function validateProps(props: CdnSiteHostingConstructProps): void {
  const { sources, sourcesWithDeploymentOptions } = props;

  // validate source specfications
  if (!sources && !sourcesWithDeploymentOptions) {
    throw new Error(
      "Either `sources` or `sourcesWithDeploymentOptions` must be specified"
    );
  } else if (sources && sourcesWithDeploymentOptions) {
    throw new Error(
      "Either `sources` or `sourcesWithDeploymentOptions` may be specified, but not both."
    );
  } else if (
    sourcesWithDeploymentOptions &&
    sourcesWithDeploymentOptions.length === 0
  ) {
    throw new Error(
      "If specified, `sourcesWithDeploymentOptions` cannot be empty"
    );
  } else if (
    sourcesWithDeploymentOptions &&
    sourcesWithDeploymentOptions.some(({ sources }) => sources.length === 0)
  ) {
    throw new Error("`sourcesWithDeploymentOptions.sources` cannot be empty");
  } else if (sources && sources.length === 0) {
    throw new Error("If specified, `sources` cannot be empty");
  }
}
