import { PersonaAuthorizer } from "../../../../src/lambda/api/authorizer";

describe("authorizer", () => {
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
    ];
    pathMatchTests.forEach((testSpec) => {
      test(`${testSpec.title}`, async () => {
        const authorizer = new PersonaAuthorizer(null, null);
        expect(
          authorizer.pathMatch(testSpec.pathDefinition, testSpec.path)
        ).toBe(testSpec.expectedResult);
      });
    });
  });
});
