import type { useClient } from 'sanity';
import type { ImportTarget } from './model';
import type { MasterPhoto, MasterRow } from './master-model';

export interface MasterImageAsset {
  _id: string;
  originalFilename?: string;
}
/** Read only the requested image assets, with pagination and bounded query parameters. */
export async function fetchMasterImages(
  base: ReturnType<typeof useClient>,
  filenames: string[],
  targets: ImportTarget[],
) {
  const names = [...new Set(filenames)];
  if (!names.length) return [];
  const wanted = new Set(names);
  const ids = [
    ...new Set(
      targets.flatMap((item) =>
        (item.photos || []).flatMap((value) => {
          const photo = value as MasterPhoto;
          return photo.sourceFilenames?.some((name) => wanted.has(name)) && photo.asset?._ref
            ? [photo.asset._ref]
            : [];
        }),
      ),
    ),
  ];
  const client = base.withConfig({ perspective: 'raw', useCdn: false, stega: false });
  const found = new Map<string, MasterImageAsset>();
  for (let index = 0; index < Math.max(names.length, ids.length); index += 100) {
    let cursor = '';
    for (;;) {
      const batch = await client.fetch<MasterImageAsset[]>(
        `*[_type=='sanity.imageAsset' && (originalFilename in $filenames || _id in $assetIds) && _id>$cursor] | order(_id asc)[0...500]{_id,originalFilename}`,
        {
          filenames: names.slice(index, index + 100),
          assetIds: ids.slice(index, index + 100),
          cursor,
        },
      );
      for (const asset of batch) found.set(asset._id, asset);
      if (batch.length < 500) break;
      cursor = batch[batch.length - 1]._id;
    }
  }
  return [...found.values()];
}
/** Prefer this item's known filename/asset association; never guess among conflicting files. */
export function resolveMasterImage(
  filename: string,
  target: ImportTarget | undefined,
  assets: MasterImageAsset[],
) {
  const available = new Set(assets.map((asset) => asset._id));
  const photos = (target?.photos || []) as MasterPhoto[];
  const attachedIds = new Set(photos.map((photo) => photo.asset?._ref));
  const remembered = [
    ...new Set(
      photos
        .filter(
          (photo) => photo.sourceFilenames?.includes(filename) && available.has(photo.asset?._ref),
        )
        .map((photo) => photo.asset._ref),
    ),
  ];
  if (remembered.length === 1)
    return { asset: assets.find((asset) => asset._id === remembered[0]), ambiguous: false };
  if (remembered.length > 1) return { asset: undefined, ambiguous: true };
  const matches = assets.filter((asset) => asset.originalFilename === filename);
  const attached = matches.filter((asset) => attachedIds.has(asset._id));
  const candidates = attached.length ? attached : matches;
  return {
    asset: candidates.length === 1 ? candidates[0] : undefined,
    ambiguous: candidates.length > 1,
  };
}
export function missingMasterImages(
  rows: MasterRow[],
  assets: MasterImageAsset[],
  files: Map<string, File>,
) {
  const missing = new Map<string, boolean>();
  for (const row of rows) {
    if (row.choice === 'skip') continue;
    for (const name of row.record.images) {
      if (files.has(name)) continue;
      const match = resolveMasterImage(name, row.target, assets);
      if (!match.asset) missing.set(name, match.ambiguous);
    }
  }
  return [...missing].map(([filename, ambiguous]) => ({ filename, ambiguous }));
}
