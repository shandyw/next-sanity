import { createClient } from '@sanity/client';
import {
  runFindLinkMonitor,
  type MonitoredFind,
  type ReferencingLook,
} from '@/lib/find-link-monitor';
import { isAuthorizedCron } from '@/lib/cron-auth';
import type { Settings } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32)
    return Response.json({ error: 'Link monitor is not configured.' }, { status: 503 });
  if (!isAuthorizedCron(request.headers.get('authorization'), secret))
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_LINK_MONITOR_TOKEN;
  if (!projectId || !dataset || !token)
    return Response.json({ error: 'Sanity link monitor is not configured.' }, { status: 503 });

  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: '2026-10-01',
    useCdn: false,
    timeout: 5_000,
    perspective: 'published',
    requestTagPrefix: 'find-link-monitor',
  });
  try {
    const result = await runFindLinkMonitor({
      loadLooks: () =>
        client.fetch<ReferencingLook[]>(
          '*[_type == "look" && defined(publishedAt) && publishedAt <= now() && !(_id in path("drafts.**"))]{_id,items[]{find}}',
        ),
      loadFinds: (ids) =>
        client.fetch<MonitoredFind[]>(
          '*[_type == "find" && _id in $ids && !(_id in path("drafts.**"))]{_id,_rev,amazonUrl,affiliateUrl,affiliateShortLinkVerified,asin,linkStatus,linkCheckResult,linkLastCheckedAt}',
          { ids },
        ),
      loadSettings: async () =>
        (await client.fetch<Settings | null>(
          '*[_type == "siteSettings" && _id == "siteSettings"][0]{amazonAssociates}',
        )) || {},
      patchFind: async (find, check, checkedAt) => {
        await client
          .patch(find._id)
          .ifRevisionId(find._rev)
          .set({
            linkStatus: check.status,
            linkCheckResult: check.result,
            linkLastCheckedAt: checkedAt,
          })
          .commit({ visibility: 'sync' });
      },
    });
    return Response.json(result, {
      status: result.failed ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      { error: 'Link monitor could not complete. Check server logs and Sanity access.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
