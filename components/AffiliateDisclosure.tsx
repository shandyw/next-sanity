import Link from 'next/link';
import { AMAZON_DISCLOSURE } from '@/lib/amazon';
export function AffiliateDisclosure({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <aside className="affiliate-disclosure body-sm" aria-label="Amazon affiliate disclosure">
      <p>
        If you buy through an Amazon affiliate link here, I may earn a commission.{' '}
        {AMAZON_DISCLOSURE}
      </p>
      <Link href="/disclosures">How recommendations and affiliate links work</Link>
    </aside>
  );
}
