export function InnerHero({
  title,
  intro,
  eyebrow = 'CurvyGirlReviews',
}: {
  title: string;
  intro: string;
  eyebrow?: string;
}) {
  return (
    <header className="inner-hero">
      <div className="inner-hero__paper">
        <p className="inner-hero__eyebrow">{eyebrow}</p>
        <h1 className="inner-hero__title">{title}</h1>
        <p className="inner-hero__intro">{intro}</p>
      </div>
      <span className="inner-hero__note" aria-hidden="true">
        No pretending.
      </span>
    </header>
  );
}
