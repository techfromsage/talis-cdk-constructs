import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";

import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { Apigatewayv2CfnStagePrefixer } from "../../../../lib";
import { CfnStageProperties } from "../../../fixtures/infra/aws-apigatewayv2/cfn_stage";
import { EmptyResource } from "../../../fixtures/infra/empty_resource";

describe("Apigatewayv2 CfnStage Prefixer", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let cfnStage: apigatewayv2.CfnStage;
  let prefixer: Apigatewayv2CfnStagePrefixer;
  let emptyPrefixer: Apigatewayv2CfnStagePrefixer;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "AspectTestStack", {});
    cfnStage = new apigatewayv2.CfnStage(stack, "api1", CfnStageProperties);
    prefixer = new Apigatewayv2CfnStagePrefixer(cfnStage, "test-prefix-");
    emptyPrefixer = new Apigatewayv2CfnStagePrefixer(cfnStage, "");
  });

  describe("Empty Prefix", () => {
    test("Keeps api name the same", () => {
      emptyPrefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Stage", {
          StageName: "stageName",
        })
      );
    });
  });

  describe("With Prefix", () => {
    test("Keeps api stage name the same", () => {
      prefixer.prefix();

      expectCDK(stack).to(
        haveResource("AWS::ApiGatewayV2::Stage", {
          StageName: "stageName",
        })
      );
    });
    test.todo("Truncates the api name if too long");
  });

  describe("Undefined Resource", () => {
    test("Raises error if no prefixer defined for resource", () => {
      const unknownResource = new EmptyResource(stack, "empty", {
        type: "EmptyResource",
      });

      expect(() => {
        new Apigatewayv2CfnStagePrefixer(unknownResource, "prefix");
      }).toThrowError(
        "Specified node is not an instance of CfnStage and cannot be prefixed using this prefixer"
      );
    });
  });
});
