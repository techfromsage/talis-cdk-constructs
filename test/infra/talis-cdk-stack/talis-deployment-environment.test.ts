import { TalisDeploymentEnvironment } from "../../../lib";

describe("Talis Deployment Environments", () => {
  test.each([
    [TalisDeploymentEnvironment.BUILD, "build"],
    [TalisDeploymentEnvironment.DEVELOPMENT, "development"],
    [TalisDeploymentEnvironment.TEST, "test"],
    [TalisDeploymentEnvironment.STAGING, "staging"],
    [TalisDeploymentEnvironment.PRODUCTION, "production"],
  ])(
    "Deployment environment %s should be defined as %s",
    (environment, expected) => {
      expect(environment).toBe(expected);
    }
  );
});
