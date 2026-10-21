import { siteUrl } from '@/lib/seo';
import { AmazonClickTracking } from '@/components/AmazonClickTracking';
import { draftMode } from 'next/headers';
import { VisualEditing } from 'next-sanity/visual-editing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SocialTab } from '@/components/SocialTab';
import { SocialLinks } from '@/components/SocialLinks';
import { Dialogs } from '@/components/Dialogs';
import { LeadModal } from '@/components/LeadModal';
import { ContentImage } from '@/components/ContentImage';
import { getSettings, demoEnabled } from '@/lib/content';
export async function generateMetadata() {
  const preview = (await draftMode()).isEnabled;
  const settings = await getSettings();
  return {
    description: settings.defaultSeo?.description,
    robots:
      preview || (process.env.NODE_ENV === 'production' && !siteUrl())
        ? { index: false, follow: false }
        : undefined,
  };
}
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const preview = (await draftMode()).isEnabled;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header
        mobileSocials={<SocialLinks settings={settings} className="social-links--mobile-nav" />}
      />
      <SocialTab settings={settings} />
      {preview && (
        <aside className="preview-notice">
          Draft preview · <a href="/api/draft/disable">Exit preview</a>
        </aside>
      )}
      {children}
      {demoEnabled && (
        <aside className="demo-notice">
          Design preview: sample reviews and placeholder photography.
        </aside>
      )}
      <AmazonClickTracking
        enabled={settings.amazonAssociates?.clickEventsEnabled === true && !preview}
      />
      <Footer demo={demoEnabled} settings={settings} />
      <Dialogs settings={settings} />
      {settings.leadModal?.enabled && settings.leadModal.image && !preview && (
        <LeadModal
          content={settings.leadModal}
          image={<ContentImage image={settings.leadModal.image} width={800} height={1000} />}
        />
      )}
      {preview && <VisualEditing />}
    </>
  );
}
