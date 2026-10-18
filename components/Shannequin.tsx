import type { ContentPhoto } from '@/lib/types';
import { ContentImage } from './ContentImage';
import { ArrowIcon } from './ArrowIcon';
import { demoEnabled } from '@/lib/content';
import { ShannequinMeasurements, ShannequinMeasurementList } from './ShannequinMeasurements';
import type { ShannequinMeasurements as Measurements } from '@/lib/shannequin-measurements';

export function Shannequin({
  image,
  about = false,
  measurements,
}: {
  image?: ContentPhoto;
  about?: boolean;
  measurements?: Measurements;
}) {
  const headingId = about ? 'shannequin-heading' : 'meet-shannequin-heading';
  const photo = image?.asset?._ref ? (
    <ContentImage
      className="shannequin__photo"
      image={image}
      preserveFullImage
      width={700}
      height={1000}
      sizes="(max-width: 767px) 90vw, 45vw"
    />
  ) : (
    <div
      className="shannequin__placeholder"
      role="img"
      aria-label="Shannequin photograph awaiting publication"
    >
      <p>
        {demoEnabled
          ? 'Development placeholder — add Shannequin’s full-body photograph in Studio.'
          : 'Shannequin’s photograph is coming soon.'}
      </p>
    </div>
  );
  return (
    <section
      className={`container shannequin${about ? ' shannequin--measurements' : ''}`}
      id={about ? 'shannequin' : 'meet-shannequin'}
      aria-labelledby={headingId}
    >
      <div className="shannequin__copy">
        <p className="eyebrow">My size-18 sidekick</p>
        <h2 id={headingId}>Meet Shannequin</h2>
        <p>
          When a piece fits more like an 18 than a 16, Shannequin steps in. My full-body size-18
          mannequin gives you another look at how it hangs.
        </p>
        <p className="script-accent">
          She brings the curves.
          <br />I bring the commentary.
        </p>
        {about && (
          <div className="shannequin__measurement-hint">
            <span aria-hidden="true">+</span>
            <div>
              <strong>Get to know her measurements</strong>
              <p>Hover or tap a point to explore.</p>
              <ShannequinMeasurementList measurements={measurements} />
            </div>
          </div>
        )}
        {!about && (
          <a className="btn btn-accent" href="/about#shannequin">
            Get to know Shannequin <ArrowIcon />
          </a>
        )}
      </div>
      <div className="shannequin__media">
        <div className="shannequin__backing" aria-hidden="true" />
        {!about && (
          <span className="shannequin__number" aria-hidden="true">
            18
          </span>
        )}
        {about ? (
          <ShannequinMeasurements
            measurements={measurements}
            hasImage={Boolean(image?.asset?._ref)}
          >
            {photo}
          </ShannequinMeasurements>
        ) : (
          photo
        )}
      </div>
    </section>
  );
}
