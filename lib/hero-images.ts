import 'server-only';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import { unstable_cache } from 'next/cache';

const folder = join(process.cwd(), 'public', 'img', 'hero');

async function chooseImages(): Promise<string[]> {
  const files = (await readdir(folder, { withFileTypes: true }))
    .filter((file) => file.isFile() && /\.(?:jpe?g|png|webp|avif)$/i.test(file.name))
    .map((file) => file.name)
    .sort();
  const selected: string[] = [];
  while (files.length && selected.length < 2) {
    const [name] = files.splice(randomInt(files.length), 1);
    selected.push(`/img/hero/${encodeURIComponent(name)}`);
  }
  return selected;
}

/** Cache by page identity, not search parameters, so archive filters keep the same photos. */
export function getHeroImages(pageKey: string): Promise<string[]> {
  return unstable_cache(chooseImages, ['hero-images-v1', pageKey], { revalidate: 300 })();
}
