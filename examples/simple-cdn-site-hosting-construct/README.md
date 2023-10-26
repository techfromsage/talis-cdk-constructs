# CdnSiteHostingConstruct Example: SimpleCdnSiteHostingConstructStack

This is an example of using the CdnSiteHostingConstruct and the CdnSiteHostingWithDnsConstruct in a simple stack to host a static website.

The CdnSiteHostingConstruct:

- creates a bucket to host the static html
- creates a cloudfront distribution to server the website

Optionionally, the CdnSiteHostingWithDnsConstruct:

- sets up a DNS entry int Route 53 pointing at the cloudfront distribution

## This Example

To build and deploy this example:

- `export AWS_PREFIX=development-XX-` where XX are your initials
  - This is used in the name of the stack and resources created, so that they do not clash with anyone elses stack in AWS
- `source awsenv <profile>` to set your credentials to the shared account
- `npm install`
- `npm run build`
- `cdk deploy`

After you have finished with the example, remove your stack in AWS using:

- `cdk destroy`

## Best Practice Using this Construct

It's best practice NOT to create a DNS entry for a production website within a cloud formation stack. In production
best practice is to be bring up a cloud formation stack and manually point a route 53 entry to the cloud front distribution.

Why? We want the ability, if necessary, to bring up a new cloud formation stack and when we are happy that it is working
as expected, switch the DNS manually to point to the new stack. 

Therefore, production deployments should use the CdnSiteHostingConstruct and set a watermarked sub domain name. For example:

```typescript
    new CdnSiteHostingConstruct(
      this,
      `TalisAppCdnSiteHostingConstruct`,
      {
        domainName: "talis.io",
        siteSubDomain: `production-eu-20231025-talis-app`,
        aliasSubDomains: ['talis-app'],
        ...
      },
    );
```

The above will create a cloud front distribution with two aliases:

- `production-eu-20231025-talis-app.talis.io`
- `talis-app.talis.io`

Outside of the cloud formation stack, DNS entries can be manually created for both the aliases and either can be used to access the website.

Unfortunately, cloud front can NOT have the same alias on two different distributions. This means we can not always set the `talis-app` alias from
the above example on a new cloud front distribution. i.e. Attempting to create:

```typescript
    new CdnSiteHostingConstruct(
      this,
      `TalisAppCdnSiteHostingConstruct`,
      {
        domainName: "talis.io",
        siteSubDomain: `production-eu-20231026-talis-app`,
        aliasSubDomains: ['talis-app'],
        ...
      },
    );
```

will fail. Despite the cloud formation stack having a different watermark, 20231026 instead of 20231025, and the siteSubDomain being `production-eu-20231026-talis-app.talis.io` instead of `production-eu-20231025-talis-app.talis.io` - the creation of the stack will fail due to the duplicate alias `talis-app.talis.io`.

Therefore - when bringing up a new watermarked stack alongside an already live production stack, the alias sub domain must not initially be set:

```typescript
    new CdnSiteHostingConstruct(
      this,
      `TalisAppCdnSiteHostingConstruct`,
      {
        domainName: "talis.io",
        siteSubDomain: `production-eu-20231026-talis-app`,
        aliasSubDomains: [],
        ...
      },
    );
```

This will mean the new stack can be deployed and tested at the watermarked DNS name, e.g. `production-eu-20231026-talis-app.talis.io`. 

When ready to switch the stacks in production, the `talis-app.talis.io` alias needs to be deleted from the old stack and added to the new stack manually.
The DNS is then switched from the old cloud front distribution to the new one.

If this was a simple DNS change, there would be no downtime. But due to the need to delete and recreate the alias on the cloud front distribution, there is a small
period where the website is in accessible. Therefore, for a production site, ONLY when switching to a new cloud formation stack, NOT on every release, a maintenance 
window is required for the switch over.

Subsequent deployments after the stack switch over DO need to add in the `talis-app` alias to the aliasSubDomains property of the construct. If they do not,
the alias will be deleted and an outage will occur.

This process should be managed via the hercules deployment script - setting up the `aliasSubDomain` for a standard deploy to the live watermark to include the
additional alias. When a different watermark is specified, to bring up a new none live stack, hercules should ensure the `aliasSubDomain` property does not
contain the additional alias.

This will require logic in both the hercules script and the projects CDK deployment code to ensure this property is set correctly.

LINK TO EXAMPLE HERE WHEN WE HAVE ONE

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
