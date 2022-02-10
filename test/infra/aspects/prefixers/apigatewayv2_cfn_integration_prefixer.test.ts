import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { Apigatewayv2CfnIntegrationPrefixer } from "../../../../lib";
import { CfnIntegrationProperties } from "../../../fixtures/infra/aws-apigatewayv2/cfn_integration";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Apigatewayv2 CfnIntegration Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnIntegration: apigatewayv2.CfnIntegration;
  let prefixer: Apigatewayv2CfnIntegrationPrefixer;
  let emptyPrefixer: Apigatewayv2CfnIntegrationPrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnIntegration = new apigatewayv2.CfnIntegration(stack, "api1", CfnIntegrationProperties);
    prefixer = new Apigatewayv2CfnIntegrationPrefixer(cfnIntegration, "test-prefix-");
    emptyPrefixer = new Apigatewayv2CfnIntegrationPrefixer(cfnIntegration, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps api name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Integration", {
          ApiId: "apiId",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Keeps api stage name the same", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Integration", {
          ApiId: "apiId",
        })
      );
    });
    test.todo("Truncates the api id if too long");
  });

  describe("Undefined Resource", () => {
    test("Raises error if no prefixer defined for resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });

      expect(() => {
        new Apigatewayv2CfnIntegrationPrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnIntegration and cannot be prefixed using this prefixer"
      );
    });
  });
});
