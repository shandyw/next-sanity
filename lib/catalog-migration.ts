import { catalogSource, catalogPlacements, reviewProgress, type CatalogFields } from './catalog';
export interface MigrationDocument extends CatalogFields {
  _id: string;
  _rev: string;
  _type: string;
  [key: string]: unknown;
}
/** Additive only. IDs, sale states, prices, references, images and editorial content are untouched. */
export function catalogMigrationPlan(documents: MigrationDocument[]) {
  return documents
    .filter((d) => d._type === 'product' && !d._id.startsWith('versions.'))
    .map((d) => {
      const setIfMissing: Record<string, unknown> = {};
      if (d.catalogSource === undefined) setIfMissing.catalogSource = catalogSource(d);
      if (d.displayPlacements === undefined) setIfMissing.displayPlacements = catalogPlacements(d);
      if (d.archived === undefined) setIfMissing.archived = false;
      if (d.reviewProgress === undefined && catalogSource(d) === 'amazon')
        setIfMissing.reviewProgress = reviewProgress(d);
      return {
        id: d._id,
        ifRevisionID: d._rev,
        setIfMissing,
        rollbackUnset: Object.keys(setIfMissing),
      };
    })
    .filter((p) => p.rollbackUnset.length);
}
