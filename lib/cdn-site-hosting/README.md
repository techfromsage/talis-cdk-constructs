# CDN Site Hosting constructs

The following constructs are used to host static sites and single-page applications in S3 via CloudFront.

## `CdnSiteHostingConstruct`

Establishes infrastructure to host a static-site or single-page-application in S3 via CloudFront.

This construct will:

- Create an S3 bucket with static website hosting enabled
- Create a CloudFront distribution to deliver site content
- Register the CloudFront distribution with the provided certificate
- Deploy provided source code to S3 and invalidate the CloudFront distribution

## `CdnSiteHostingWithDnsConstruct`

Establishes infrastructure to host a static-site or single-page-application in S3 via CloudFront, with DNS record provisioning

This construct will:

- Create a Route 53 entry for the specified site domain
- Generate a new TLS certificate for the newly-created Route 53 domain
- Delegate underlying infrastructure and code deployment to `CdnSiteHostingConstruct`
- Associate the DNS entry with the underpinning CloudFront distribution
