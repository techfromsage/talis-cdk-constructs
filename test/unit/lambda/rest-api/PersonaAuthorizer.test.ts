import { PersonaAuthorizer, ParsedArn } from "../../../../src/lambda/rest-api/PersonaAuthorizer";

describe("authorizer", () => {
  describe("parseMethodArn", () => {
    const parseMethodArnTests = [
      {
        title: "parses simple method arn",
        methodArn: "arn:aws:execute-api:us-west-2:123456789012:api-id/stage/GET/resource",
        parsedArn: {
          method: "GET",
          resourcePath: "/resource",
          apiOptions: {
            region: "us-west-2",
            restApiId: "api-id",
            stage: "stage",
          },
          awsAccountId: "123456789012",
          apiVersion: "api-id",
        },
      },
      {
        title: "parses resource method arn",
        methodArn: "arn:aws:execute-api:eu-west-1:302477901552:atpstdpb1c/*/PUT/simple-resource/{simpleResourceId}",
        parsedArn: {
          method: "PUT",
          resourcePath: "/simple-resource/{simpleResourceId}",
          apiOptions: {
            region: "eu-west-1",
            restApiId: "atpstdpb1c",
            stage: "*",
          },
          awsAccountId: "302477901552",
          apiVersion: "atpstdpb1c",
        },
      },
      {
        title: "parses nested resource method arn",
        methodArn: "arn:aws:execute-api:eu-west-1:302477901552:atpstdpb1c/*/GET/simple-resource/{simpleResourceId}/child-resource/{childResourceId}",
        parsedArn: {
          method: "GET",
          resourcePath: "/simple-resource/{simpleResourceId}/child-resource/{childResourceId}",
          apiOptions: {
            region: "eu-west-1",
            restApiId: "atpstdpb1c",
            stage: "*",
          },
          awsAccountId: "302477901552",
          apiVersion: "atpstdpb1c",
        },
      }
    ];
    parseMethodArnTests.forEach((testSpec) => {
      test(`${testSpec.title}`, async () => {
        const authorizer = new PersonaAuthorizer(null, null);
        expect(
          authorizer.parseMethodArn(testSpec.methodArn)
        ).toStrictEqual(testSpec.parsedArn);
      });
    });
  });

  describe("pathMatch", () => {
    const pathMatchTests = [
      {
        title: "matches simple paths",
        pathDefinition: "/1/route1",
        path: "/1/route1",
        expectedResult: true,
      },
      {
        title: "does not match different simple paths",
        pathDefinition: "/1/route1",
        path: "/1/route2",
        expectedResult: false,
      },
      {
        title: "matches long paths",
        pathDefinition: "/1/a/b/route1",
        path: "/1/a/b/route1",
        expectedResult: true,
      },
      {
        title: "matches paths terminated by argument",
        pathDefinition: "/1/route1/{id}",
        path: "/1/route1/test_id",
        expectedResult: true,
      },
      {
        title: "does not matche paths when argument incorrect syntax",
        pathDefinition: "/1/route1/:id",
        path: "/1/route1/test_id",
        expectedResult: false,
      },
      {
        title: "matches paths containing an argument",
        pathDefinition: "/1/a/{id}/route1",
        path: "/1/a/test_id/route1",
        expectedResult: true,
      },
      {
        title: "does not match when number of segments don't match",
        pathDefinition: "/a/b/route1",
        path: "/a/b/c/route1",
        expectedResult: false,
      },
    ];
    pathMatchTests.forEach((testSpec) => {
      test(`${testSpec.title}`, async () => {
        const authorizer = new PersonaAuthorizer(null, null);
        expect(
          authorizer.pathMatch(testSpec.pathDefinition, testSpec.path),
        ).toBe(testSpec.expectedResult);
      });
    });
  });
});
