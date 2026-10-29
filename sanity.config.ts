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
  auth: { loginMethod: 'token' },
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
          .title('CurvyGirlReviews')
          .items([
            S.listItem()
              .title('Content')
              .child(
                S.list()
                  .title('Content')
                  .items([
                    S.documentTypeListItem('review').title('Reviews'),
                    S.documentTypeListItem('look').title('Shop the Looks'),
                    S.documentTypeListItem('blogPost').title('Blog Posts'),
                  ]),
              ),
            S.listItem()
              .title('Amazon Finds')
              .child(
                S.list()
                  .title('Amazon Finds')
                  .items([
                    S.listItem()
                      .title('Quick Add Find')
                      .child(
                        S.documentTypeList('find')
                          .title('Quick Add Find')
                          .initialValueTemplates([S.initialValueTemplateItem('quick-add-find')]),
                      ),
                    S.documentTypeListItem('find').title('All Finds'),
                    ...[
                      ['Not Tested', 'coalesce(experienceStatus, "notTested") == "notTested"'],
                      ['Received — Needs Testing', 'experienceStatus == "received"'],
                      ['Tested', 'experienceStatus == "tested"'],
                      [
                        'Needs Attention',
                        '!defined(title) || !defined(slug.current) || !defined(category) || (!defined(amazonUrl) && !defined(affiliateUrl)) || (experienceStatus in ["received", "tested"] && !defined(acquisitionSource)) || count(productImages[approvalStatus != "approved" || sourceKind == "unverified"]) > 0 || count(editorialImages[approvalStatus != "approved" || sourceKind == "unverified"]) > 0',
                      ],
                    ].map(([title, filter]) =>
                      S.listItem()
                        .title(title)
                        .child(
                          S.documentTypeList('find')
                            .title(title)
                            .filter(`_type == "find" && (${filter})`),
                        ),
                    ),
                  ]),
              ),
            S.listItem()
              .title('Website')
              .child(
                S.list()
                  .title('Website')
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
                    S.documentTypeListItem('clothingCategory').title('Clothing categories'),
                    S.documentTypeListItem('brand').title('Brands'),
                    S.documentTypeListItem('blogCategory').title('Blog categories'),
                    S.documentTypeListItem('author').title('Authors'),
                  ]),
              ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => [
      ...templates.filter(
        (t) =>
          !singletonTypes.has(t.schemaType) &&
          !['product', 'productCollection'].includes(t.schemaType),
      ),
      {
        id: 'quick-add-find',
        title: 'Quick Add Find',
        schemaType: 'find',
        value: { experienceStatus: 'notTested' },
      },
    ],
  },
  document: {
    actions: (actions, context) =>
      singletonTypes.has(context.schemaType)
        ? actions.filter((a) => !['delete', 'duplicate', 'unpublish'].includes(a.action || ''))
        : actions,
  },
});
