import type { FitCheck } from '@/lib/fit-check';
import {
  hasMannequinAssessment,
  hasShandyAssessment,
  highlightLabels,
  mannequinVerdicts,
  shandyVerdicts,
  stretchLabels,
  usableFitCheck,
} from '@/lib/fit-check';

type Observation = [label: string, value?: string];

function ObservationGroup({ title, rows }: { title: string; rows: Observation[] }) {
  const filled = rows.filter(([, value]) => value?.trim());
  if (!filled.length) return null;
  return (
    <div className="fit-check__group">
      <h4>{title}</h4>
      <dl>
        {filled.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ShannequinFitCheck({
  value,
  sizeWorn,
  usualSize,
}: {
  value?: FitCheck;
  sizeWorn?: string;
  usualSize?: string;
}) {
  if (!usableFitCheck(value) || !value) return null;
  const shandy =
    (value.testedBy === 'shandy' || value.testedBy === 'both') && hasShandyAssessment(value.shandy)
      ? value.shandy
      : undefined;
  const mannequin =
    (value.testedBy === 'shannequin' || value.testedBy === 'both') &&
    hasMannequinAssessment(value.shannequin)
      ? value.shannequin
      : undefined;
  const both = Boolean(shandy && mannequin);
  const stretch = shandy?.stretchRating;
  const validStretch = Number.isInteger(stretch) && stretch! >= 1 && stretch! <= 5;
  const highlights = value.highlights?.filter((tag) => highlightLabels[tag]) || [];
  const shandyStyling = Boolean(shandy?.undergarments?.trim() || shandy?.notes?.trim());
  const mannequinStyling = Boolean(mannequin?.notes?.trim());
  const shandyVerdict = shandy?.overallFit && shandyVerdicts[shandy.overallFit];
  const mannequinVerdict = mannequin?.visualFit && mannequinVerdicts[mannequin.visualFit];
  const showWornSize = Boolean(
    sizeWorn?.trim() && (both || (usualSize?.trim() && usualSize.trim() !== sizeWorn.trim())),
  );
  const indicator = (
    <p className="fit-check__indicator">
      {shandy ? 'Personally tested on Shandy' : 'Mannequin fit assessment'}
      {shandy && sizeWorn?.trim() ? ` · Size ${sizeWorn}` : ''}
    </p>
  );

  return (
    <section className="fit-check" aria-labelledby="fit-check-title">
      <div className="container fit-check__inner">
        <div className="fit-check__header">
          <p className="eyebrow">The real-body report</p>
          <h2 id="fit-check-title">The Shannequin Fit Check.</h2>
          <p>Because the size chart doesn’t tell the whole story.</p>
        </div>
        <div className="fit-check__main">
          {(shandyVerdict || mannequinVerdict) && (
            <div className="fit-check__verdict" aria-label="Fit verdict">
              <p className="fit-check__label">The fit verdict</p>
              <div className="fit-check__verdict-row">
                <div className="fit-check__verdict-results">
                  {shandyVerdict && (
                    <div>
                      <p className="fit-check__verdict-text">{shandyVerdict}</p>
                      {usualSize?.trim() && <p className="fit-check__meta">Usual size: {usualSize}</p>}
                      {showWornSize && <p className="fit-check__meta">Size worn: {sizeWorn}</p>}
                    </div>
                  )}
                  {mannequinVerdict && (
                    <div>
                      <p className="fit-check__perspective">On Shannequin · visual assessment</p>
                      <p className="fit-check__verdict-text">{mannequinVerdict}</p>
                      {mannequin.sizeDisplayed?.trim() && (
                        <p className="fit-check__meta">Size displayed: {mannequin.sizeDisplayed}</p>
                      )}
                    </div>
                  )}
                </div>
                {indicator}
              </div>
            </div>
          )}
          {!shandyVerdict && !mannequinVerdict && indicator}

          <div className="fit-check__assessments">
            {shandy && (
              <div className="fit-check__assessment">
                <h3 className="visually-hidden">Personally tested on Shandy</h3>
                {!shandyVerdict && (usualSize?.trim() || showWornSize) && (
                  <p className="fit-check__meta">
                    {[
                      usualSize?.trim() && `Usual size: ${usualSize}`,
                      showWornSize && `Size worn: ${sizeWorn}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <ObservationGroup
                  title="Sizing & silhouette"
                  rows={[
                    ['Bust', shandy.bustFit],
                    ['Waist', shandy.waistFit],
                    ['Hip', shandy.hipFit],
                    ['Length', shandy.length],
                  ]}
                />
                {(validStretch ||
                  shandy.sittingComfort?.trim() ||
                  shandy.movementComfort?.trim()) && (
                  <div className="fit-check__group">
                    <h4>Fabric & comfort</h4>
                    {validStretch && (
                      <div className="fit-check__stretch">
                        <p>
                          Stretch: {stretch}/5 — {stretchLabels[stretch! - 1]}
                        </p>
                        <div className="fit-check__segments" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span className={n <= stretch! ? 'is-filled' : ''} key={n} />
                          ))}
                        </div>
                      </div>
                    )}
                    <dl>
                      {shandy.sittingComfort?.trim() && (
                        <div>
                          <dt>Sitting</dt>
                          <dd>{shandy.sittingComfort}</dd>
                        </div>
                      )}
                      {shandy.movementComfort?.trim() && (
                        <div>
                          <dt>Movement / comfort</dt>
                          <dd>{shandy.movementComfort}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            )}
            {mannequin && (
              <div className="fit-check__assessment">
                <h3>On Shannequin</h3>
                <p className="fit-check__note">Visual assessment on a size-18 mannequin.</p>
                {!mannequinVerdict && mannequin.sizeDisplayed?.trim() && (
                  <p className="fit-check__meta">Size displayed: {mannequin.sizeDisplayed}</p>
                )}
                <ObservationGroup
                  title="Sizing & silhouette"
                  rows={[
                    ['Bust', mannequin.bustFit],
                    ['Waist', mannequin.waistFit],
                    ['Hip', mannequin.hipFit],
                    ['Garment length', mannequin.garmentLength],
                    ['Drape & silhouette', mannequin.drape],
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {(highlights.length > 0 || shandyStyling || mannequinStyling) && (
          <div className="fit-check__highlights">
            {highlights.length > 0 && (
              <>
                <h3>Fit highlights</h3>
                <ul>
                  {highlights.map((tag) => (
                    <li key={tag}>{highlightLabels[tag]}</li>
                  ))}
                </ul>
              </>
            )}
            {shandyStyling && (
              <ObservationGroup
                title="Styling notes"
                rows={[
                  ['Bra / undergarments', shandy?.undergarments],
                  ['Additional fit notes', shandy?.notes],
                ]}
              />
            )}
            {mannequinStyling && (
              <ObservationGroup
                title={shandyStyling ? 'Mannequin styling notes' : 'Styling notes'}
                rows={[['Additional visual observations', mannequin?.notes]]}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
