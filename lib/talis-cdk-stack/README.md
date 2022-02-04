# TalisCdkStack

### TalisCdkStackProps

Properties for any custom Talis CDK Stack, these are on top of the default CDK Stack props.

| Property              | Type                       | Required | Description                                       |
| --------------------- | -------------------------- | -------- | ------------------------------------------------- |
| vpcId                 | string                     | Optional | ID of the VPC to deploy stack components into     |
| deploymentEnvironment | TalisDeploymentEnvironment | Required | The environment this stack is being deployed into |

### TalisCdkStack

A base stack on top of the default CDK Stack on which to build a custom Talis App CDK Stack, provides helper methods and variables for referencing commonly used components including environment based removal policies and vpc resolution.

```ts
const app = new cdk.App();
const props: TalisCdkStackProps = {
  deploymentEnvironment: TalisDeploymentEnvironment.TEST,
};
const stack = new TalisCdkStack(app, "my-stack", props);

// Get the removal policy for the stacks environment
// Returns a CDK Removal Policy
stack.getRemovalPolicyForTalisDeploymentEnvironment(
  props.deploymentEnvironment
);
```

### TalisDeploymentEnvironment

Helper constants to allow us to map and reference our deployment environments

| Key         | Description                             |
| ----------- | --------------------------------------- |
| DEVELOPMENT | Local development environment           |
| TEST        | Environments spun up for running tests  |
| BUILD       | Environments spun up for running builds |
| STAGING     | Staging environment                     |
| PRODUCTION  | Production Environment                  |

### TalisRegions

Helper constants to allow us to more easily map our product regions to AWS regions.

| Key    | Description  |
| ------ | ------------ |
| CANADA | ca-central-1 |
| EU     | eu-west-1    |
