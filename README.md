# Talis CDK constructs

A Talis library of AWS CDK constructs, implemented in Typescript.

## Contributing

This project follows [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/), and enforces this choice during the build and release cycle.

Builds are conducted by CircleCI, and upon successful build of the `main` branch, [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/) will generate a new release, an appropriate version (based on commits), and release-notes to cover the content of the commit log.

## Available constructs

- CDN Site Hosting constructs

  - `CdnSiteHostingConstruct` for static-site or single-page application hosting in S3 via CloudFront.
  - `CdnSiteHostingWithDnsConstruct` for static-site or single-page application hosting in S3 via CloudFront, with DNS record provisioning

- `LambdaWorker`

  - A serverless background job.
  - Possible replacement for Resque Workers / Jobs
  - Details [here](/examples/simple-lambda-worker/README.md).

- `AuthenticatedApi`
  - An API Gateway (v2)
  - Built in optional Persona authentication on routes
  - Details [here](/examples/simple-authenticated-api/README.md).

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npm run lint` will check code quality and style guidelines (using ESlint and Prettier)
- `npm run format` will format the code (using Prettier)
