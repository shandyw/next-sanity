'use client';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';
import { schemaTypes, singletonTypes } from './sanity/schema';
export default defineConfig({
  name: 'curvygirlreviews',
  title: 'CurvyGirlReviews',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  basePath: '/studio',
  plugins: [
    presentationTool({
      previewUrl: {
        initial: '/',
        previewMode: { enable: '/api/draft/enable', disable: '/api/draft/disable' },
      },
    }),
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Homepage')
              .child(S.document().schemaType('homepage').documentId('homepage')),
            S.listItem()
              .title('About page')
              .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
            S.listItem()
              .title('Site settings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            ...S.documentTypeListItems().filter((i) => !singletonTypes.has(i.getId() || '')),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((t) => !singletonTypes.has(t.schemaType)),
  },
  document: {
    actions: (actions, context) =>
      singletonTypes.has(context.schemaType)
        ? actions.filter((a) => !['delete', 'duplicate', 'unpublish'].includes(a.action || ''))
        : actions,
  },
});
