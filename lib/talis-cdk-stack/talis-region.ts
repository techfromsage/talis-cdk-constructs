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

const talisRegionToShortRegionMap = new Map<TalisRegion, TalisShortRegion>();
talisRegionToShortRegionMap.set(TalisRegion.CANADA, TalisShortRegion.CANADA);
talisRegionToShortRegionMap.set(TalisRegion.EU, TalisShortRegion.EU);
talisRegionToShortRegionMap.set(TalisRegion.LOCAL, TalisShortRegion.LOCAL);

export function getTalisShortRegionFromTalisRegionName(
  talisRegionName: string
): TalisShortRegion | undefined {
  const talisRegion = Object.values(TalisRegion).find(
    (talisRegion) => talisRegion === talisRegionName
  );
  if (!talisRegion) {
    return undefined;
  }
  return talisRegionToShortRegionMap.get(talisRegion);
}
