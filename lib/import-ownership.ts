/** Editorial fields are never replaced on repeat imports. Overrides apply to source facts. */
export function ownedImportFields(
  fields: Record<string, unknown>,
  current?: Record<string, unknown>,
) {
  if (!current) return fields;
  const protectedFields = new Set([
    'description',
    'photos',
    'displayPlacements',
    'catalogSource',
    'archived',
    'relatedProducts',
    'relatedReview',
    'reviewProgress',
    ...((current.importOverrides as string[]) || []),
  ]);
  // An unchanged prior imported name may follow the CSV; an intentional editor change wins.
  const prior = (current.importedFacts as Record<string, unknown> | undefined)?.title;
  if (prior === undefined || current.title !== prior) protectedFields.add('title');
  if (protectedFields.has('availability') || protectedFields.has('saleStatus')) {
    protectedFields.add('availability');
    protectedFields.add('saleStatus');
  }
  if (protectedFields.has('purchaseUrl')) {
    protectedFields.add('closetPlatform');
    protectedFields.add('vintedUrl');
  }
  const result = Object.fromEntries(
    Object.entries(fields).filter(([key]) => !protectedFields.has(key)),
  );
  if (Array.isArray(fields.photos)) {
    const existing = (current.photos as { asset?: { _ref?: string } }[]) || [];
    const refs = new Set(existing.map((p) => p.asset?._ref));
    const incoming = fields.photos as { asset?: { _ref?: string }; sourceFilenames?: string[] }[];
    result.photos = [
      ...existing.map((p) => {
        const matched = incoming.find((n) => n.asset?._ref === p.asset?._ref);
        const filenames = [
          ...new Set([
            ...((p as { sourceFilenames?: string[] }).sourceFilenames || []),
            ...(matched?.sourceFilenames || []),
          ]),
        ];
        return filenames.length ? { ...p, sourceFilenames: filenames } : p;
      }),
      ...incoming.filter((p) => !refs.has(p.asset?._ref)),
    ];
  }
  return result;
}
