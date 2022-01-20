import {
  expect as expectCDK,
  countResources,
  haveResource,
  haveResourceLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import { Environment, RemovalPolicy, Stack } from "@aws-cdk/core";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { CdnSiteHostingWithDnsConstruct } from "../../../lib/cdn-site-hosting";

// hosted-zone requires an environment be attached to the Stack
const testEnv: Environment = {
  region: "eu-west-1",
  account: "abcdefg12345",
};

const fakeSiteSubDomain = "test";
const fakeDomain = "example.com";
const fakeFqdn = `${fakeSiteSubDomain}.${fakeDomain}`;

describe("CdnSiteHostingWithDnsConstruct", () => {
  describe("With a provisioned Stack", () => {
    let stack: Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack", { env: testEnv });
      new CdnSiteHostingWithDnsConstruct(stack, "MyTestConstruct", {
        siteSubDomain: fakeSiteSubDomain,
        domainName: fakeDomain,
        removalPolicy: RemovalPolicy.DESTROY,
        sources: [s3deploy.Source.asset("./")],
        websiteErrorDocument: "error.html",
        websiteIndexDocument: "index.html",
      });
    });

    test("provisions an ACM TLS certificate covering the domain", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudFormation::CustomResource", {
          DomainName: fakeFqdn,
          Region: "us-east-1",
        })
      );
    });

    test("provisions a single S3 bucket with website hosting configured", () => {
      expectCDK(stack).to(countResources("AWS::S3::Bucket", 1));
      expectCDK(stack).to(
        haveResource("AWS::S3::Bucket", {
          BucketName: fakeFqdn,
          WebsiteConfiguration: {
            ErrorDocument: "error.html",
            IndexDocument: "index.html",
          },
        })
      );
    });

    test("provisions a CloudFront distribution linked to S3", () => {
      expectCDK(stack).to(countResources("AWS::CloudFront::Distribution", 1));
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudFront::Distribution", {
          DistributionConfig: {
            Aliases: [fakeFqdn],
            DefaultRootObject: "index.html",
            ViewerCertificate: {
              AcmCertificateArn: {},
            },
          },
        })
      );
    });

    test("issues a bucket deployment with CloudFront invalidation for the specified sources", () => {
      expectCDK(stack).to(countResources("Custom::CDKBucketDeployment", 1));
      expectCDK(stack).to(
        haveResourceLike("Custom::CDKBucketDeployment", {
          DistributionPaths: ["/*"],
        })
      );
    });

    test("provisions a Route 53 'A Record' covering the domain", () => {
      expectCDK(stack).to(countResources("AWS::Route53::RecordSet", 1));
      expectCDK(stack).to(
        haveResourceLike("AWS::Route53::RecordSet", {
          Name: `${fakeFqdn}.`,
          Type: "A",
        })
      );
    });
  });

  describe("When no error document is provided", () => {
    let stack: Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestStack", { env: testEnv });
      new CdnSiteHostingWithDnsConstruct(stack, "MyTestConstruct", {
        siteSubDomain: fakeSiteSubDomain,
        domainName: fakeDomain,
        removalPolicy: RemovalPolicy.DESTROY,
        sources: [s3deploy.Source.asset("./")],
        websiteIndexDocument: "index.html",
      });
    });

    test("provisions an ACM TLS certificate covering the domain", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudFormation::CustomResource", {
          DomainName: fakeFqdn,
          Region: "us-east-1",
        })
      );
    });

    test("provisions a single S3 bucket with website hosting configured", () => {
      expectCDK(stack).to(countResources("AWS::S3::Bucket", 1));
      expectCDK(stack).to(
        haveResource("AWS::S3::Bucket", {
          BucketName: fakeFqdn,
          WebsiteConfiguration: {
            IndexDocument: "index.html",
          },
        })
      );
    });

    test("provisions a CloudFront distribution linked to S3", () => {
      expectCDK(stack).to(countResources("AWS::CloudFront::Distribution", 1));
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudFront::Distribution", {
          DistributionConfig: {
            Aliases: [fakeFqdn],
            DefaultRootObject: "index.html",
            ViewerCertificate: {
              AcmCertificateArn: {},
            },
          },
        })
      );
    });

    test("issues a bucket deployment with CloudFront invalidation for the specified sources", () => {
      expectCDK(stack).to(countResources("Custom::CDKBucketDeployment", 1));
      expectCDK(stack).to(
        haveResourceLike("Custom::CDKBucketDeployment", {
          DistributionPaths: ["/*"],
        })
      );
    });

    test("provisions a Route 53 'A Record' covering the domain", () => {
      expectCDK(stack).to(countResources("AWS::Route53::RecordSet", 1));
      expectCDK(stack).to(
        haveResourceLike("AWS::Route53::RecordSet", {
          Name: `${fakeFqdn}.`,
          Type: "A",
        })
      );
    });
  });

  describe("For a routed SPA", () => {
    let stack: Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestRoutedSPAStack", { env: testEnv });
      new CdnSiteHostingWithDnsConstruct(stack, "MyTestConstruct", {
        siteSubDomain: fakeSiteSubDomain,
        domainName: fakeDomain,
        removalPolicy: RemovalPolicy.DESTROY,
        isRoutedSpa: true,
        sources: [s3deploy.Source.asset("./")],
        websiteIndexDocument: "index.html",
      });
    });

    test("configures a custom error response code override in CloudFront", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudFront::Distribution", {
          DistributionConfig: {
            CustomErrorResponses: [
              {
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: "/index.html",
              },
            ],
          },
        })
      );
    });
    test("configures an error document in S3", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::S3::Bucket", {
          WebsiteConfiguration: {
            IndexDocument: "index.html",
            ErrorDocument: "index.html",
          },
        })
      );
    });
  });

  describe("For a routed SPA when error document is provided", () => {
    let stack: Stack;

    beforeAll(() => {
      const app = new cdk.App();
      stack = new cdk.Stack(app, "TestRoutedSPAStack", { env: testEnv });
      new CdnSiteHostingWithDnsConstruct(stack, "MyTestConstruct", {
        siteSubDomain: fakeSiteSubDomain,
        domainName: fakeDomain,
        removalPolicy: RemovalPolicy.DESTROY,
        isRoutedSpa: true,
        sources: [s3deploy.Source.asset("./")],
        websiteErrorDocument: "error.html",
        websiteIndexDocument: "index.html",
      });
    });

    test("configures a custom error response code override in CloudFront", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::CloudFront::Distribution", {
          DistributionConfig: {
            CustomErrorResponses: [
              {
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: "/index.html",
              },
            ],
          },
        })
      );
    });
    test("configures an error document in S3", () => {
      expectCDK(stack).to(
        haveResourceLike("AWS::S3::Bucket", {
          WebsiteConfiguration: {
            ErrorDocument: "error.html",
            IndexDocument: "index.html",
          },
        })
      );
    });
  });
});
