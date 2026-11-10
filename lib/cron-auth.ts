import { timingSafeEqual } from 'node:crypto';

export function isAuthorizedCron(header: string | null, secret?: string) {
  if (!secret || secret.length < 32 || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
