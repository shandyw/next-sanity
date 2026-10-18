import { handlePricing } from '@/lib/pricing/server';
export const runtime = 'nodejs';
export const maxDuration = 90;
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handlePricing(request, (await context.params).id);
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handlePricing(request, (await context.params).id);
}
