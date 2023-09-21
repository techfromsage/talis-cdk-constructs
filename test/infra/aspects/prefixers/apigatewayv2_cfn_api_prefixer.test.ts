import * as cdk from "aws-cdk-lib";
import { aws_apigatewayv2 as apigatewayv2 } from "aws-cdk-lib";
import { Annotations, Template } from "aws-cdk-lib/assertions";

import { Apigatewayv2CfnApiPrefixer } from "../../../../lib";
import { CfnApiProperties } from "../../../fixtures/infra/aws-apigatewayv2/cfn_api";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Apigatewayv2 CfnApi Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnApi: apigatewayv2.CfnApi;
  let prefixer: Apigatewayv2CfnApiPrefixer;
  let emptyPrefixer: Apigatewayv2CfnApiPrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnApi = new apigatewayv2.CfnApi(stack, "api1", CfnApiProperties);
    prefixer = new Apigatewayv2CfnApiPrefixer(cfnApi, "test-prefix-");
    emptyPrefixer = new Apigatewayv2CfnApiPrefixer(cfnApi, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps api name the same", () => {
      emptyPrefixer.prefix();

      Template.fromStack(stack).hasResourceProperties(
        "AWS::ApiGatewayV2::Api",
        {
          Name: "apiName",
        },
      );
    });
  });

  describe("With Prefix", () => {
    test("Adds prefix to the start of the api name", () => {
      prefixer.prefix();

      Template.fromStack(stack).hasResourceProperties(
        "AWS::ApiGatewayV2::Api",
        {
          Name: "test-prefix-apiName",
        },
      );
    });
    test.todo("Truncates the api name if too long");
  });

  describe("Undefined Resource", () => {
    test("Adds error annotation if prefixer cannot be used for cloud formation resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });
      new Apigatewayv2CfnApiPrefixer(unknownResource, "prefix");
      Annotations.fromStack(stack).hasError(
        "/AspectTestStack/empty",
        "Node is not a CfnApi and cannot be prefixed using this prefixer",
      );
    });
  });
});
