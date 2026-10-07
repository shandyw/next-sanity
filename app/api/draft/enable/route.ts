import { defineEnableDraftMode } from 'next-sanity/draft-mode';
import { sanityClient, configured } from '@/lib/sanity';
import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  if (!configured || !process.env.SANITY_API_READ_TOKEN)
    return NextResponse.json({ error: 'Preview is not configured.' }, { status: 503 });
  const { GET } = defineEnableDraftMode({
    client: sanityClient().withConfig({ token: process.env.SANITY_API_READ_TOKEN }),
  });
  return GET(request);
}
