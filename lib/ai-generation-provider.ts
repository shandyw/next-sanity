/** The current Images Edits JSON API accepts two image URLs and returns base64 JPEGs. */
export async function requestOpenAiFashionImages(input: {
  apiKey: string;
  model: string;
  modelImageUrl: string;
  productImageUrl: string;
  prompt: string;
  count: number;
  editorId: string;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}) {
  const response = await (input.fetcher || fetch)('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      images: [{ image_url: input.modelImageUrl }, { image_url: input.productImageUrl }],
      prompt: input.prompt,
      n: input.count,
      size: '1024x1536',
      quality: 'low',
      output_format: 'jpeg',
      output_compression: 75,
      safety_identifier: input.editorId,
    }),
    signal: input.signal,
  });
  if (response.status === 429)
    return {
      ok: false as const,
      status: 429,
      retryAfter: response.headers.get('retry-after') || '60',
    };
  if (!response.ok) return { ok: false as const, status: response.status >= 500 ? 503 : 422 };
  const result = (await response.json()) as { data?: { b64_json?: string }[] };
  if (!result.data?.length || result.data.length > input.count)
    return { ok: false as const, status: 502 };
  return { ok: true as const, images: result.data.map((item) => item.b64_json || '') };
}
