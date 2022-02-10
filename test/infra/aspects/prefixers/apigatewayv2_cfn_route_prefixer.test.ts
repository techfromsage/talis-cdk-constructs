import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { Apigatewayv2CfnRoutePrefixer } from "../../../../lib";
import { CfnRouteProperties } from "../../../fixtures/infra/aws-apigatewayv2/cfn_route";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Apigatewayv2 CfnRoute Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnRoute: apigatewayv2.CfnRoute;
  let prefixer: Apigatewayv2CfnRoutePrefixer;
  let emptyPrefixer: Apigatewayv2CfnRoutePrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnRoute = new apigatewayv2.CfnRoute(stack, "api1", CfnRouteProperties);
    prefixer = new Apigatewayv2CfnRoutePrefixer(cfnRoute, "test-prefix-");
    emptyPrefixer = new Apigatewayv2CfnRoutePrefixer(cfnRoute, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps api name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Route", {
          ApiId: "apiId",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Keeps api stage name the same", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Route", {
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
        new Apigatewayv2CfnRoutePrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnRoute and cannot be prefixed using this prefixer"
      );
    });
  });
});
