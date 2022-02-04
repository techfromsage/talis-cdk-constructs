import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { Template } from "@aws-cdk/assertions";
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
        expectedPropsPrefixed,
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
        expectedPropsUnprefixed,
        expectedPropsPrefixed,
      }) => {
        new resourceType(stack, "test-item", resourceProps);
        Aspects.of(stack).add(resourcePrefixer);
        expectCDK(stack).to(haveResource(expectedType, expectedPropsPrefixed));
      }
    );
  });

  describe("Undefined Resources", () => {
    test("Raises error if no prefixer registered for cloud formation resource", () => {
      new EmptyResource(stack, "empty", { type: "Empty::Resource" });
      Aspects.of(stack).add(resourcePrefixer);
      expect(() => {
        Template.fromStack(stack);
      }).toThrowError("Undefined resource for resource prefixer");
    });
  });
});
