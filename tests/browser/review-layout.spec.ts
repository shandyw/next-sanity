import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ReviewArticle} from './components/ReviewArticle';
      const root=createRoot(document.getElementById('fixture'));const copy=text=>[{_type:'block',_key:text,style:'normal',markDefs:[],children:[{_type:'span',_key:'span',text,marks:[]}]}];
      window.pauses=0;HTMLMediaElement.prototype.pause=function(){window.pauses++};
      window.renderReview=async(mode='finds')=>{const legacy=mode==='legacy';const doc={_id:'test-review',_type:'review',slug:'test-review',title:'Great jeans. Questionable pockets.',titleAccent:'Questionable pockets.',publishedAt:'2026-10-15T12:00:00Z',sizeWorn:'18',categories:[{_id:'denim',title:'Denim'}],featuredImage:{asset:{_ref:'front'},alt:'Front view of jeans'},photos:[{asset:{_ref:'front'},alt:'Front view of jeans'},{asset:{_ref:'back'},alt:'Back of jeans',caption:'Back detail'}],videoUrl:'https://example.test/try-on.mp4',format:legacy?'video':'both',transcript:'Readable try-on transcript.',reviewSections:legacy?undefined:{firstImpression:{heading:'My first look',copy:copy('First impressions copy')},fitComfort:{copy:copy('Comfort copy')},whoMightLike:{copy:copy('Who copy')},finalTake:{copy:copy('Final copy')}},body:legacy?copy('Existing legacy article copy'):undefined,shannequinQuote:legacy?undefined:'A sample pocket observation.',ctaProduct:legacy?undefined:{_id:'linked',_type:'product',title:'Linked jeans',slug:'linked-jeans',shoppingSection:mode,availability:mode==='closet'?'sold':'available'},ctaLabel:mode==='closet'?'See this piece':undefined};root.render(await ReviewArticle({document:doc,returnTo:'/reviews?category=denim'}));};window.renderReview();`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'review-server-fixtures',
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /^(next\/link|next-sanity|@\/lib\/content|@\/lib\/seo)$|^(\.\/ContentImage|@\/components\/ContentImage)$/,
            },
            (args) => ({ path: args.path, namespace: 'fixture' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            loader: 'tsx',
            resolveDir: process.cwd(),
            contents:
              args.path === 'next/link'
                ? `export default function Link(props){return <a {...props}/>;}`
                : args.path === 'next-sanity'
                  ? `export const stegaClean=value=>value;`
                  : args.path === '@/lib/content'
                    ? `export const demoEnabled=false;export const getDocuments=async()=>[];export const getSettings=async()=>({});export const getContent=async()=>({shannequinImage:{asset:{_ref:'shared-cutout'},alt:'Shared full-body Shannequin photograph'}});`
                    : args.path === '@/lib/seo'
                      ? `export const siteUrl=()=>new URL('https://example.test');`
                      : `export function ContentImage({image,width,height,className}){return <img className={className} src={'/img/curvy.png?asset='+image?.asset?._ref} alt={image?.alt||'Review photograph placeholder'} width={width} height={height}/>;}`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
for (const width of [1440, 390]) {
  test(`editorial sections, mixed media, shared image and optional product CTA at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/review-layout-fixture', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<html lang="en"><head><title>Review layout check</title></head><body><div id="fixture"></div></body></html>',
      }),
    );
    await page.route('https://example.test/try-on.mp4', (route) =>
      route.fulfill({ contentType: 'video/mp4', body: '' }),
    );
    await page.goto('/review-layout-fixture');
    await page.addStyleTag({
      content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
    });
    await page.addScriptTag({ content: fixture });
    await expect(page.locator('h1')).toHaveText('Great jeans. Questionable pockets.');
    await expect(page.locator('.review-story__section > h2')).toHaveText([
      'My first look',
      'Fit / Comfort',
      'Who might like this?',
      'Final Take',
    ]);
    await expect(page.locator('.review-story__number')).toHaveText(['01', '02', '03', '04']);
    const sharedImage = page.locator('.review-shannequin__media img');
    const sharedSrc = await sharedImage.getAttribute('src');
    expect(sharedSrc).toContain('shared-cutout');
    await expect(page.locator('.shannequin__number')).toHaveCount(0);
    await page.getByRole('button', { name: 'Watch my try-on', exact: true }).click();
    await expect(page.getByLabel('Fashion review video')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Watch video: My try-on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Show photograph: Back detail' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Fashion review video')).toBeHidden();
    expect(
      await page.evaluate(() => (window as unknown as { pauses: number }).pauses),
    ).toBeGreaterThan(1);
    await expect(
      page.getByRole('link', { name: 'Explore this find', exact: true }),
    ).toHaveAttribute('href', '/shop/linked-jeans');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await page.evaluate(() =>
      (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
        'closet',
      ),
    );
    await expect(page.getByRole('link', { name: 'See this piece', exact: true })).toHaveAttribute(
      'href',
      '/shop/linked-jeans',
    );
    await expect(
      page.getByText('This item has sold. Its details are still available.'),
    ).toBeVisible();
    await expect(sharedImage).toHaveAttribute('src', sharedSrc!);
    await page.evaluate(() =>
      (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
        'legacy',
      ),
    );
    await expect(page.getByText('Existing legacy article copy')).toBeVisible();
    await expect(page.locator('.review-story__product,.review-shannequin')).toHaveCount(0);
    await expect(page.getByLabel('Fashion review video')).toBeVisible();
  });
}
test('review copy and all photos remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/reviews/example-jeans-review');
  await expect(page.getByRole('heading', { name: 'Final Take', exact: true })).toBeVisible();
  await expect(page.locator('.review-story__media-stage')).toHaveCount(2);
  for (const stage of await page.locator('.review-story__media-stage').all())
    await expect(stage).toBeVisible();
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await context.close();
});
