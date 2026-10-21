'use client';
import { DeleteProductAction } from './sanity/catalog/DeleteProductAction';
import { ProductsTool } from './sanity/catalog/ProductsTool';
import { ReviewWishlistTool } from './sanity/review-wishlist/ReviewWishlistTool';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';
import { schemaTypes, singletonTypes } from './sanity/schema';
import { InventoryTool } from './sanity/inventory/InventoryTool';
import { PriceDocumentAction } from './sanity/pricing/PricingPanel';
export default defineConfig({
  name: 'curvygirlreviews',
  title: 'CurvyGirlReviews',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  basePath: '/studio',
  auth: { loginMethod: 'token' },
  tools: [
    { name: 'products', title: 'Products', component: ProductsTool },
    { name: 'inventory', title: 'Inventory', component: InventoryTool },
    { name: 'review-wishlist', title: 'Review Wishlist', component: ReviewWishlistTool },
  ],
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
            S.listItem()
              .title('Products')
              .child(
                S.list()
                  .title('Products')
                  .items([
                    S.listItem()
                      .title('All Products')
                      .child(S.documentTypeList('product').title('All Products')),
                    ...[
                      [
                        'My Closet',
                        'catalogSource == "closet" || (!defined(catalogSource) && shoppingSection != "finds")',
                      ],
                      [
                        'Curated Finds',
                        '"finds" in displayPlacements || (!defined(displayPlacements) && shoppingSection == "finds")',
                      ],
                      [
                        'My Review Wishlist',
                        '"reviewWishlist" in displayPlacements || (!defined(displayPlacements) && onReviewWishlist == true)',
                      ],
                      ['Archived', 'archived == true'],
                    ].map(([title, filter]) =>
                      S.listItem()
                        .title(title)
                        .child(
                          S.documentTypeList('product')
                            .title(title)
                            .filter(`_type == "product" && (${filter})`),
                        ),
                    ),
                  ]),
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (i) => !singletonTypes.has(i.getId() || '') && i.getId() !== 'product',
            ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => [
      ...templates.filter((t) => !singletonTypes.has(t.schemaType)),
      {
        id: 'review-wishlist-product',
        title: 'Amazon item for My Review Wishlist',
        schemaType: 'product',
        value: {
          shoppingSection: 'finds',
          catalogSource: 'amazon',
          displayPlacements: ['finds', 'reviewWishlist'],
          reviewProgress: 'wanted',
          onReviewWishlist: true,
          retailer: 'Amazon',
          affiliateLink: false,
          personallyTried: false,
          experienceStatus: 'curated',
          contentReviewStatus: 'needs_review',
          indexingIntent: 'noindex',
          priority: 'medium',
          requestedQuantity: 1,
          receivedQuantity: 0,
          availability: 'available',
          saleStatus: 'available',
        },
      },
    ],
  },
  document: {
    actions: (actions, context) =>
      singletonTypes.has(context.schemaType)
        ? actions.filter((a) => !['delete', 'duplicate', 'unpublish'].includes(a.action || ''))
        : context.schemaType === 'product'
          ? [
              ...actions.map((action) =>
                action.action === 'delete' ? DeleteProductAction : action,
              ),
              PriceDocumentAction,
            ]
          : actions,
  },
});
