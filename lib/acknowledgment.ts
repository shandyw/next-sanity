export function acknowledgment(d: {
  readerProvided?: boolean;
  senderDisplayName?: string;
  senderNamePermission?: boolean;
  thankYouMessage?: string;
}) {
  if (!d.readerProvided) return undefined;
  if (!d.senderNamePermission)
    return 'Thank you to the reader who provided this item for an honest review.';
  const name = d.senderDisplayName?.trim();
  return (
    d.thankYouMessage?.trim() ||
    (name
      ? `Thank you, ${name}, for providing this item for an honest review.`
      : 'Thank you to the reader who provided this item for an honest review.')
  );
}
