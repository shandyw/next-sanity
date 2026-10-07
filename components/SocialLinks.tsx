import type { Settings } from '@/lib/types';
import { safeExternal } from '@/lib/urls';
const icons: Record<string, React.ReactNode> = {
  Facebook: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13 21v-8h3l.5-3H13V8.5c0-1 .5-1.5 1.5-1.5H17V4.5h-2.5C11.5 4.5 10 6 10 8.5V10H8v3h2v8"
        fill="currentColor"
      />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  ),
  Pinterest: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M11 21l2-8M10.6 12.6c-.4-2 .8-3.6 2.4-3.6 1.4 0 2.2 1 2.2 2.2 0 1.7-1 3-2.3 3-.7 0-1.2-.4-1.3-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  YouTube: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" fill="currentColor" />
    </svg>
  ),
  TikTok: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.6 5.82a4.28 4.28 0 0 1-3.35-3.32h-2.9v13.3a2.52 2.52 0 1 1-1.77-2.4V9.4a5.5 5.5 0 1 0 4.67 5.44V9.7a7.15 7.15 0 0 0 3.35.86V7.6a4.27 4.27 0 0 1-1-1.78z"
        fill="currentColor"
      />
    </svg>
  ),
};
export function SocialLinks({
  settings,
  header = false,
}: {
  settings: Settings;
  header?: boolean;
}) {
  return (
    <ul
      className={`social-links social-links--${header ? 'header' : 'footer'}`}
      aria-label="Social media"
    >
      {settings.socials
        ?.filter((s) => safeExternal(s.url))
        .map((s) => (
          <li key={s.platform}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`CurvyGirlReviews on ${s.platform}`}
            >
              {icons[s.platform] || <span aria-hidden="true">{s.platform[0]}</span>}
            </a>
          </li>
        ))}
    </ul>
  );
}
