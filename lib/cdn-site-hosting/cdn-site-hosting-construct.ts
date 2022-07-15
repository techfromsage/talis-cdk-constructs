import * as cdk from "@aws-cdk/core";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import * as origins from "@aws-cdk/aws-cloudfront-origins";
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
  public readonly cloudfrontDistribution: cloudfront.Distribution;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: CdnSiteHostingConstructProps
  ) {
    super(scope, id);

    validateProps(props);

    const siteDomain = getSiteDomain(props);

    const certificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      `${siteDomain}-cert`,
      props.certificateArn
    );

    let websiteErrorDocument: string | undefined = props.websiteErrorDocument;
    if (!websiteErrorDocument) {
      websiteErrorDocument = props.isRoutedSpa
        ? props.websiteIndexDocument
        : undefined;
    }

    // S3 bucket
    this.s3Bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: siteDomain,
      websiteIndexDocument: props.websiteIndexDocument,
      websiteErrorDocument,
      publicReadAccess: true,
      removalPolicy: props.removalPolicy,
      autoDeleteObjects: props.removalPolicy === cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "Bucket", { value: this.s3Bucket.bucketName });

    const defaultSecurityHeaders: cloudfront.ResponseSecurityHeadersBehavior = {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/default-src
      contentSecurityPolicy: {
        contentSecurityPolicy: "default-src 'self';",
        override: true,
      },
      // https://web.dev/security-headers/#xcto
      contentTypeOptions: { override: true },
      // https://web.dev/security-headers/#recommended-usages-4
      frameOptions: {
        frameOption: cloudfront.HeadersFrameOption.DENY,
        override: true,
      },
      // https://web.dev/referrer-best-practices/#setting-your-referrer-policy:-best-practices
      referrerPolicy: {
        referrerPolicy:
          cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
        override: true,
      },
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security#examples
      strictTransportSecurity: {
        accessControlMaxAge: cdk.Duration.days(365 * 2),
        includeSubdomains: true,
        preload: true,
        override: true,
      },
      // xxs-protection is overridden by the contentSecurityPolicy in modern browsers
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
      xssProtection: { protection: false, override: true },
    };

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeadersPolicy",
      {
        securityHeadersBehavior: {
          ...defaultSecurityHeaders,
          ...props.securityHeaders,
        },
      }
    );

    // Cloudfront distribution
    this.cloudfrontDistribution = new cloudfront.Distribution(
      this,
      "SiteDistribution",
      {
        sslSupportMethod: cloudfront.SSLMethod.SNI,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
        certificate,
        domainNames: [siteDomain],
        defaultRootObject: props.websiteIndexDocument,
        defaultBehavior: {
          origin: new origins.S3Origin(this.s3Bucket),
          responseHeadersPolicy: responseHeadersPolicy,
        },
        errorResponses: props.isRoutedSpa
          ? [
              {
                httpStatus: 404,
                responseHttpStatus: 200,
                responsePagePath: `/${props.websiteIndexDocument}`,
              },
            ]
          : undefined,
      }
    );
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.cloudfrontDistribution.distributionId,
    });

    // Deploy site contents to S3 bucket
    if (props.sourcesWithDeploymentOptions) {
      const isSingleDeploymentStep =
        props.sourcesWithDeploymentOptions.length === 1;

      // multiple sources with granular cache and invalidation control
      const deployments = props.sourcesWithDeploymentOptions.map(
        (
          { name, sources, distributionPathsToInvalidate, cacheControl },
          index
        ) => {
          const isInvalidationRequired =
            distributionPathsToInvalidate &&
            distributionPathsToInvalidate.length > 0;

          const nameOrIndex = name ? name : `${index}`;

          return new s3deploy.BucketDeployment(
            this,
            `CustomDeploy${nameOrIndex}`,
            {
              cacheControl,
              sources: sources,
              prune: isSingleDeploymentStep,
              destinationBucket: this.s3Bucket,
              distribution: isInvalidationRequired
                ? this.cloudfrontDistribution
                : undefined,
              distributionPaths: isInvalidationRequired
                ? distributionPathsToInvalidate
                : undefined,
            }
          );
        }
      );

      deployments.forEach((deployment, deploymentIndex) => {
        if (deploymentIndex > 0) {
          deployment.node.addDependency(deployments[deploymentIndex - 1]);
        }
      });
    } else if (props.sources) {
      // multiple sources, with default cache-control and wholesale invalidation
      new s3deploy.BucketDeployment(this, "DeployAndInvalidate", {
        sources: props.sources,
        destinationBucket: this.s3Bucket,
        distribution: this.cloudfrontDistribution,
        distributionPaths: ["/*"],
      });
    }
  }
}

function validateProps(props: CdnSiteHostingConstructProps): void {
  const { sources, sourcesWithDeploymentOptions, websiteIndexDocument } = props;

  // validate source specifications
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

  if (websiteIndexDocument.startsWith("/")) {
    throw Error("leading slashes are not allowed in websiteIndexDocument");
  }
}
