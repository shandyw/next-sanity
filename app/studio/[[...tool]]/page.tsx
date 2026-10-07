import { Studio as EmbeddedStudio } from '@/components/Studio';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Content Studio', robots: { index: false, follow: false } };
export default function Studio() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.NEXT_PUBLIC_SANITY_DATASET)
    return (
      <main className="container">
        <h1>Configure Sanity Studio</h1>
        <p>
          Add the project ID and dataset to .env.local, then restart the server. Studio uses your
          Sanity account to authenticate editors.
        </p>
      </main>
    );
  return <EmbeddedStudio />;
}
