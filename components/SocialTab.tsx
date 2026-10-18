import type { Settings } from '@/lib/types';
import { safeExternal } from '@/lib/urls';
import { SocialLinks } from './SocialLinks';

export function SocialTab({ settings }: { settings: Settings }) {
  if (!settings.socials?.some((social) => safeExternal(social.url))) return null;
  return (
    <nav className="social-tab" aria-label="Follow CurvyGirlReviews">
      <SocialLinks settings={settings} className="social-links--tab" />
    </nav>
  );
}
