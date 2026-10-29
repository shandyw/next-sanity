const MAX_SLUG_LENGTH = 74;
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  's',
  'the',
  'to',
  'with',
]);

export function generateSeoSlug(title: string): string {
  const words =
    title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || [];
  const coreWords = words.filter((word) => !STOP_WORDS.has(word));
  const selectedWords = (coreWords.length >= 3 ? coreWords : words).slice(0, 5);
  const slugWords: string[] = [];

  for (const word of selectedWords) {
    const candidate = [...slugWords, word].join('-');
    if (candidate.length > MAX_SLUG_LENGTH) {
      if (slugWords.length === 0) slugWords.push(word.slice(0, MAX_SLUG_LENGTH));
      break;
    }
    slugWords.push(word);
  }

  return slugWords.join('-');
}
