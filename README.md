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

- `TalisCdkStack`
  - Base stack to be extended by talis stacks
  - Details [here](/lib/talis-cdk-stack/README.md)

## Available Constants

- `TalisRegion`

  - Aliases of AWS regions to the regions we deploy applications
  - Details [here](/lib/talis-cdk-stack/README.md)

- `TalisDeploymentEnvironment`
  - Aliases and resuable constants for referencing our specific deployment environments.
  - Details [here](/lib/talis-cdk-stack/README.md)

## Available Aspects

- `ResourcePrefixer`

  - Prefixs all AWS resources with the given prefix
  - Details [here](/lib/aspects/README.md)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run infra-test` perform the infra jest unit tests
- `npm run integration-test` perform the integration tests
- `npm run lint` will check code quality and style guidelines (using ESlint and Prettier)
- `npm run format` will format the code (using Prettier)

## Integration Tests

The integration tests are run against versions of the example projects deployed into AWS.

To run the integration tests locally:

- `export AWS_PREFIX=development-XX-` where XX are your initials
- The `authenticated-lambda` construct integration test needs the following environment variables for client/secrets. The values can be found by searching for `talis-cdk-construct integration tests` in keeper.
  - `export TALIS_CDK_AUTH_API_MISSING_SCOPE_CLIENT=`
  - `export TALIS_CDK_AUTH_API_MISSING_SCOPE_SECRET=`
  - `export TALIS_CDK_AUTH_API_VALID_CLIENT=`
  - `export TALIS_CDK_AUTH_API_VALID_SECRET=`
- Following the instruction to deploy the `simple-lambda-worker` in the examples readme.
- Following the instruction to deploy the `simple-authenticated-api` in the examples readme.
- `npm run integration-test`

## Surviving _commitlint_ & _semantic-release_

_commiitlint_ and _semantic-release_ are two libraries used in the project.

- _commitlint_ currently checks all commit semantics.

- _semantic-release_ will be triggered on commits to main.

### _commitlint_

The commits semantic check is really only relevant when merging (`squash&commit`) PRs into main, but it is currently configured to apply to all commits.

Because the _commitlint_ library can be very restrictive on your commit semantics, for local interin commits (only!), you may want to use the `git commit --no-verify` option.

Remember squashing your local commits and correct the comment so that it follows the _commitlint_ rules before committing & pushing to origin.

For commits squash use `git reset --soft` instead of `git rebase -i`, rebase will most likely fail.

Be aware of GitHub PRs feature _reviewers code suggestions_: accepting & commiting suggestions using the GitHub GUI will generate commits with coauthor information in the comment that will break the _commitlint_ rules.

### _semantic-release_

_Breaking Change_: _semantic-release 17.4.4_ doesn't support _feat!:_ as a _breaking change_ commit type, and it won't recognize it as a _feat_ type either, so as a result it won't publish a new release.

Use the commit comment footer _BREAKING CHANGE:..._ instead. This will trigger a new _Breaking Release_.

To check if your branch follows the _semantic-release_ rules, run the command
`npx semantic-release -b add_release_label_to_the_namespace --dry-run --branches main`

Note: Be aware the commit semantic rules in both libraries are not fully aligned, meaning that some merges into master could pass _commitlint_ rules, but still not trigger the publishing of a new release by _semantic-release_ (this is expected).
