import { TalisRegions } from "../../../lib";

describe("Talis Regions", () => {
  test("Defines Canada region as ca-central-1", () => {
    expect(TalisRegions.CANADA).toBe("ca-central-1");
  });
  test("Defines EU region as eu-west-1", () => {
    expect(TalisRegions.EU).toBe("eu-west-1");
  });
});
