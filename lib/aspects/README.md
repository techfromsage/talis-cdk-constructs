# Aspects

### Resource Prefixer Aspect

Defines a CDK Aspect that can be applied to a cdk stack to prefix all resources in the given stack with a given prefix. Useful for creating multiple CDK stacks in the same account but prefixing the resources for a given developer.

```ts
import { ResourcePrefixer } from "talis-cdk-constructs";

const app = new cdk.App();
const props: TalisCdkStackProps = {
  deploymentEnvironment: TalisDeploymentEnvironment.TEST,
};
const stack = new TalisCdkStack(app, "my-stack", props);

// Apply the aspect to the stack
// This will prefix all resources with 'dev-xx-'
// I.e. a dynamodb table called 'archive' in the stack will now be named 'dev-xx-archive'
Aspects.of(stack).add(new ResourcePrefixer("dev-xx-"));
```
