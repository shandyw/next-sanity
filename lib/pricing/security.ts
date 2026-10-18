export class PricingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || '';
  if (!/^Bearer [^\s]{20,4096}$/.test(value))
    throw new PricingError(401, 'Sign in to Studio to use private pricing.');
  return value.slice(7);
}
export function requirePricingAdmin(userId: string, configuredIds: string) {
  const ids = configuredIds
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  if (!ids.length)
    throw new PricingError(
      503,
      `Pricing setup required: configure PRICING_ADMIN_USER_IDS. Your Sanity user ID is ${userId}.`,
    );
  if (!ids.includes(userId))
    throw new PricingError(403, 'Your account is not authorized to use private pricing.');
}
export function requirePrivateDataset(
  name: string | undefined,
  publicName: string | undefined,
  datasets: { name: string; aclMode: string }[],
) {
  if (!name || name === publicName || datasets.find((d) => d.name === name)?.aclMode !== 'private')
    throw new PricingError(
      503,
      'Pricing setup required: SANITY_PRICING_DATASET must name a separate, existing PRIVATE dataset. Public storage is refused.',
    );
}
export async function limitedRequestText(request: Request, limit = 100000) {
  const reader = request.body?.getReader();
  if (!reader) throw new PricingError(400, 'A JSON request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new PricingError(413, 'Pricing request exceeds the 100 KB limit.');
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buffer);
}
