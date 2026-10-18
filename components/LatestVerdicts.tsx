import type { DocumentContent } from '@/lib/types';
import { CardGrid } from './CardGrid';
import { ArrowIcon } from './ArrowIcon';

/** Receives the published, newest-first review feed; search state is deliberately not an input. */
export function LatestVerdicts({ reviews }: { reviews: DocumentContent[] }) {
  const latest = reviews.slice(0, 3);
  return (
    <section className="review-section" id="trending" aria-labelledby="trendingHeading">
      <div className="container">
        <div className="section-heading">
          <h2 id="trendingHeading">The Latest Verdicts</h2>
          <a className="text-link archive-link" href="/reviews">
            <span>View all reviews</span>
            <ArrowIcon />
          </a>
        </div>
        {latest.length ? (
          <CardGrid items={latest} homepage />
        ) : (
          <div className="latest-empty">
            <p className="eyebrow">Coming soon</p>
            <h3>Real try-ons are on their way.</h3>
            <p>Honest fit notes. No sugarcoating.</p>
          </div>
        )}
        <div className="review-checklist" aria-labelledby="checklist-title">
          <p id="checklist-title">On my review checklist</p>
          <ol>
            {['Fit', 'Fabric', 'Comfort'].map((criterion, index) => (
              <li key={criterion}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span> {criterion}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
