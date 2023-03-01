import {
  TalisRegion,
  TalisShortRegion,
  getTalisShortRegionFromTalisRegion,
} from "../../../lib";

describe("Talis Region", () => {
  test("Defines Canada region as ca-central-1", () => {
    expect(TalisRegion.CANADA).toBe("ca-central-1");
  });
  test("Defines EU region as eu-west-1", () => {
    expect(TalisRegion.EU).toBe("eu-west-1");
  });
});

describe("Talis Short Region", () => {
  test("Defines Canada region as ca", () => {
    expect(TalisShortRegion.CANADA).toBe("ca");
  });
  test("Defines EU region as eu", () => {
    expect(TalisShortRegion.EU).toBe("eu");
  });
});

describe("getTalisShortRegionFromTalisRegionName", () => {
  test("Returns correct short region for Canada", () => {
    expect(getTalisShortRegionFromTalisRegion("ca-central-1")).toBe(
      TalisShortRegion.CANADA
    );
  });
  test("Returns correct short region for EU", () => {
    expect(getTalisShortRegionFromTalisRegion(TalisRegion.EU)).toBe(
      TalisShortRegion.EU
    );
  });
  test("Returns undefined if the env region is not defined", () => {
    expect(getTalisShortRegionFromTalisRegion("foo")).toBeUndefined();
  });
});
