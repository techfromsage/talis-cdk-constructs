export enum TalisRegion {
  CANADA = "ca-central-1",
  EU = "eu-west-1",
  LOCAL = "local",
}

export enum TalisShortRegion {
  CANADA = "ca",
  EU = "eu",
  LOCAL = "local",
}

const talisRegionToShortRegionMap = {
  [TalisRegion.CANADA]: TalisShortRegion.CANADA,
  [TalisRegion.EU]: TalisShortRegion.EU,
  [TalisRegion.LOCAL]: TalisShortRegion.LOCAL,
};

export function getTalisShortRegionFromTalisRegion(
  talisRegion: string,
): TalisShortRegion | undefined {
  return talisRegionToShortRegionMap[talisRegion as TalisRegion] ?? undefined;
}
