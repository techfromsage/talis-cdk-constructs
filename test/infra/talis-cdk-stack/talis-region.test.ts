import { TalisRegion } from "../../../lib";

describe("Talis Region", () => {
  test("Defines Canada region as ca-central-1", () => {
    expect(TalisRegion.CANADA).toBe("ca-central-1");
  });
  test("Defines EU region as eu-west-1", () => {
    expect(TalisRegion.EU).toBe("eu-west-1");
  });
});
