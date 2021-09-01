import * as cdk from "@aws-cdk/core";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";

export interface SourcesWithDeploymentOptions {
  name?: string;
  sources: s3deploy.ISource[];
  distributionPathsToInvalidate?: string[];
  cacheControl?: s3deploy.CacheControl[];
}

export interface CommonCdnSiteHostingProps {
  domainName: string;
  removalPolicy: cdk.RemovalPolicy;
  siteSubDomain: string;
  sources?: s3deploy.ISource[];
  sourcesWithDeploymentOptions?: SourcesWithDeploymentOptions[];
  websiteErrorDocument: string;
  websiteIndexDocument: string;
}
