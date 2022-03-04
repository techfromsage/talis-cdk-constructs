import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { Annotations, Template } from "@aws-cdk/assertions";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { ResourcePrefixer } from "../../../lib";
import { Aspects } from "@aws-cdk/core";
import { EmptyResource } from "../../fixtures/infra/empty_resource";
import { ResourcePrefixerTestCases } from "../../fixtures/infra/resource_prefixer_test_cases";

describe("Resource Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let resourcePrefixer: ResourcePrefixer;
  let emptyResourcePrefixer: ResourcePrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    resourcePrefixer = new ResourcePrefixer("test-prefix-");
    emptyResourcePrefixer = new ResourcePrefixer("");
  });

  describe("Basic Usage - Empty Prefix", () => {
    test.each(ResourcePrefixerTestCases)(
      "Does not change the name of $expectedType",
      ({
        resourceType,
        resourceProps,
        expectedType,
        expectedPropsUnprefixed,
      }) => {
        new resourceType(stack, "test-item", resourceProps);
        Aspects.of(stack).add(emptyResourcePrefixer);
        expectCDK(stack).to(
          haveResource(expectedType, expectedPropsUnprefixed)
        );
      }
    );
  });

  describe("Basic Usage - With Prefix", () => {
    test.each(ResourcePrefixerTestCases)(
      "Prefixes the name of $expectedType",
      ({
        resourceType,
        resourceProps,
        expectedType,
        expectedPropsPrefixed,
      }) => {
        new resourceType(stack, "test-item", resourceProps);
        Aspects.of(stack).add(resourcePrefixer);
        expectCDK(stack).to(haveResource(expectedType, expectedPropsPrefixed));
      }
    );
  });

  describe("Truncates long resource names", () => {
    test("reduces name to 64 characters if longer", () => {
      new Role(stack, "id", {
        roleName:
          "kYTwwGzerWgBAZEnEKbuUnvLzFnZhRiuDAWlmjpOZhebJYTNKOcxuJDvjwzthdiIKvjVbYmSAuIwprweKYTlOjhQtptvGPCMaFsdRuufBYBhvykpxISQbeGgDXLnFxYqZSkAjZMJchsj",
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      });
      Aspects.of(stack).add(resourcePrefixer);
      expectCDK(stack).to(
        haveResource("AWS::IAM::Role", {
          RoleName:
            "test-prefix-kYTwwGzerWgBAZEnEKbuUnvLzFnZhRiuDAWlmjpOZhebJYTNKOcx",
        })
      );
    });
  });

  describe("Undefined Resources", () => {
    test("Adds warning annotation if no prefixer registered for cloud formation resource", () => {
      new EmptyResource(stack, "empty", { type: "Empty::Resource " });
      Aspects.of(stack).add(resourcePrefixer);
      Annotations.fromStack(stack).hasWarning(
        "/AspectTestStack/empty",
        "No defined resource prefixer for: Empty::Resource "
      );
    });
  });
});
