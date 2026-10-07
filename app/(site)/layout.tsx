import { draftMode } from 'next/headers';
import { VisualEditing } from 'next-sanity/visual-editing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Dialogs } from '@/components/Dialogs';
import { getSettings, demoEnabled } from '@/lib/content';
export async function generateMetadata() {
  const preview = (await draftMode()).isEnabled;
  const settings = await getSettings();
  return {
    description: settings.defaultSeo?.description,
    robots: preview ? { index: false, follow: false } : undefined,
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
      <Header settings={settings} />
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
      <Footer settings={settings} demo={demoEnabled} />
      <Dialogs settings={settings} />
      {preview && <VisualEditing />}
    </>
  );
}
