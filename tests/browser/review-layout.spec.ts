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
      window.renderReview=async(mode='linked')=>{const legacy=mode==='legacy';const doc={_id:'test-review',_type:'review',slug:'test-review',title:'Great jeans. Questionable pockets.',titleAccent:'Questionable pockets.',publishedAt:'2026-10-15T12:00:00Z',sizeWorn:'18',usualSize:mode==='fit'?'16/18':undefined,finalVerdict:mode==='noVerdict'?undefined:mode==='long'?'A thoughtfully made outfit piece with beautiful details but important sizing reservations for all-day comfort.':'Worth it — with reservations.',acquisitionSource:mode==='noAcquisition'?undefined:'selfPurchased',priceWhenReviewed:19.99,reviewCurrency:'USD',categories:[{_id:'denim',title:'Denim'}],featuredImage:{asset:{_ref:'front'},alt:'Front view of jeans'},photos:[{asset:{_ref:'front'},alt:'Front view of jeans'},{asset:{_ref:'back'},alt:'Back of jeans',caption:'Back detail'},{asset:{_ref:'side'},alt:'Side of jeans',caption:'Side detail'},{asset:{_ref:'waist'},alt:'Waist of jeans',caption:'Waist detail'}],videoUrl:mode==='youtube'?'https://youtu.be/M7lc1UVf-VE?si=shared':mode==='local'?'/public/videos/try-on.mp4':'https://example.test/try-on.mp4',format:legacy?'video':'both',transcript:'Readable try-on transcript.',reviewSections:legacy?undefined:{firstImpression:{heading:'My first look',copy:copy(mode==='long'?'First impressions copy '.repeat(40):'First impressions copy')},fitComfort:{copy:copy('Comfort copy')},whoMightLike:{copy:copy('Who copy')},finalTake:{copy:copy(mode==='long'?'Final copy '.repeat(40):'Final copy')}},body:legacy?copy('Existing legacy article copy'):undefined,shannequinQuote:legacy?undefined:'A sample pocket observation.',fitCheck:mode==='fit'?{enabled:true,testedBy:'both',shandy:{overallFit:'runsSmall',stretchRating:2,waistFit:'Snug',sittingComfort:'Comfortable'},shannequin:{sizeDisplayed:'18',visualFit:'loose',drape:'Falls softly'},highlights:['snugWaistband','bustFriendly']}:undefined,primaryFind:legacy||mode==='noFind'?undefined:{_id:'linked',title:'Linked jeans',category:{title:'Sweaters'},amazonUrl:'https://www.amazon.com/dp/B0ABC12345',affiliateUrl:mode==='noAffiliate'?undefined:mode==='invalidAffiliate'?'https://example.com/invalid':'https://www.amazon.com/dp/B0ABC12345?tag=curvygirl-20',linkStatus:mode==='unavailable'?'unavailable':undefined}};root.render(await ReviewArticle({document:doc,returnTo:'/reviews?category=denim'}));};window.renderReview();`,
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
                /^(next\/link|next-sanity|@\/lib\/content|@\/lib\/seo|@\/lib\/looks)$|^(\.\/ContentImage|@\/components\/ContentImage)$/,
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
                    ? `export const demoEnabled=false;export const getDocuments=async()=>[];export const getSettings=async()=>({amazonAssociates:{active:true,tag:'curvygirl-20'}});export const getContent=async(type)=>{if(type!=='aboutPage')throw new Error('Shannequin image must come from About page');return {shannequinImage:{asset:{_ref:'shared-cutout'},alt:'Shared full-body Shannequin photograph'}}};`
                    : args.path === '@/lib/seo'
                      ? `export const siteUrl=()=>new URL('https://example.test');`
                      : args.path === '@/lib/looks'
                        ? `export const findAmazonLink=(find)=>find?.linkStatus==='unavailable'?undefined:find?.affiliateUrl?.includes('amazon.com/dp/')&&find.affiliateUrl.includes('tag=curvygirl-20')?{href:find.affiliateUrl,affiliate:true}:find?.amazonUrl?{href:find.amazonUrl,affiliate:false}:undefined;`
                        : `export function ContentImage({image,width,height,className}){return <img className={className} src={'/img/curvy.png?asset='+image?.asset?._ref} alt={image?.alt||'Review photograph placeholder'} width={width} height={height}/>;}`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
for (const width of [1440, 390]) {
  test(`editorial sections, mixed media, shared image and optional Find CTA at ${width}px`, async ({
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
    await page.route('**/videos/try-on.mp4', (route) =>
      route.fulfill({
        contentType: 'video/mp4',
        path: 'public/videos/smiling-woman-posing-in-front-of-clothing-rack-2026-10-03-03-59-46-utc.mp4',
      }),
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
    await expect(page.locator('.review-story__number')).toHaveText(['01', '02', '03']);
    const sharedImage = page.locator('.review-shannequin__media img');
    const sharedSrc = await sharedImage.getAttribute('src');
    expect(sharedSrc).toContain('shared-cutout');
    await expect(page.locator('.shannequin__number')).toHaveCount(0);
    await expect(page.locator('.review-story__thumbnail')).toHaveCount(4);
    await expect(page.getByRole('button', { name: /Watch video:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next photographs' })).toBeVisible();
    await page.getByRole('button', { name: 'Next photographs' }).click();
    await expect(page.getByRole('button', { name: 'Previous photographs' })).toBeEnabled();
    await page.getByRole('button', { name: 'Watch me try it on' }).click();
    await expect(page.getByLabel('Fashion review video')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Watch my try-on video' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Watch my try-on video' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Watch me try it on' })).toBeFocused();
    const backDetail = page.getByRole('button', { name: 'Show photograph: Back detail' });
    await backDetail.focus();
    await expect(backDetail).toBeFocused();
    await backDetail.press('Enter');
    await expect(page.locator('.review-story__media-stage').nth(1)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { pauses: number }).pauses))
      .toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: /Shop this sweater on Amazon/ })).toHaveAttribute(
      'href',
      'https://www.amazon.com/dp/B0ABC12345?tag=curvygirl-20',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await page.evaluate(() =>
      (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
        'legacy',
      ),
    );
    await expect(page.getByText('Existing legacy article copy')).toBeVisible();
    await expect(page.locator('.review-story__product,.review-shannequin')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Watch me try it on' })).toBeVisible();
    await page.evaluate(() =>
      (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
        'youtube',
      ),
    );
    await expect(page.locator('.review-story__video-dialog iframe')).toHaveCount(0);
    await page.getByRole('button', { name: 'Watch me try it on' }).click();
    await expect(page.locator('.review-story__video-dialog iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
    );
    await page.getByRole('button', { name: 'Close video' }).click();
    await expect(page.locator('.review-story__video-dialog iframe')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Watch me try it on' })).toBeFocused();
    await page.evaluate(() =>
      (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
        'local',
      ),
    );
    await page.getByRole('button', { name: 'Watch me try it on' }).click();
    await expect(page.locator('.review-story__video-dialog video')).toHaveAttribute(
      'src',
      '/videos/try-on.mp4',
    );
    await expect(page.locator('.review-story__video-dialog iframe')).toHaveCount(0);
    const localVideo = page.locator('.review-story__video-dialog video');
    await expect
      .poll(() => localVideo.evaluate((video: HTMLVideoElement) => video.readyState))
      .toBeGreaterThan(0);
    await localVideo.evaluate((video: HTMLVideoElement) => {
      video.dataset.previousOpening = 'true';
    });
    await page.getByRole('button', { name: 'Close video' }).click();
    await page.getByRole('button', { name: 'Watch me try it on' }).click();
    await expect(page.locator('.review-story__video-dialog video')).not.toHaveAttribute(
      'data-previous-opening',
      'true',
    );
    await expect
      .poll(() =>
        page
          .locator('.review-story__video-dialog video')
          .evaluate((video: HTMLVideoElement) => video.currentTime),
      )
      .toBeLessThan(1);
  });
}
test('Review verdict, transparency, affiliate CTA and Saved Items follow available data', async ({
  page,
}) => {
  await page.route('**/review-layout-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><body><div id="fixture"></div></body></html>',
    }),
  );
  await page.goto('/review-layout-fixture');
  await page.addScriptTag({ content: fixture });
  await expect(page.locator('.review-story__final-verdict')).toContainText(
    'Worth it — with reservations.',
  );
  await expect(page.locator('.review-story__section:has(#review-finalTake)')).toContainText(
    'Final copy',
  );
  await expect(page.locator('.review-story')).not.toContainText('Price when reviewed:');
  await expect(page.locator('.review-story__acquisition')).toContainText(
    'Purchased myself — this item was purchased with my own money.',
  );
  await expect(page.locator('.review-story__final-cta .affiliate-disclosure')).toContainText(
    'As an Amazon Associate',
  );
  const save = page.getByRole('button', { name: 'Save item: Great jeans. Questionable pockets.' });
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  await save.focus();
  await page.keyboard.press('Enter');
  const unsave = page.getByRole('button', {
    name: 'Remove from saved items: Great jeans. Questionable pockets.',
  });
  await expect(unsave).toHaveAttribute('aria-pressed', 'true');
  await unsave.click();
  await expect(save).toHaveAttribute('aria-pressed', 'false');
  for (const mode of ['noAffiliate', 'invalidAffiliate']) {
    await page.evaluate(
      (value) =>
        (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
          value,
        ),
      mode,
    );
    const ordinaryLink = page.getByRole('link', { name: /Shop this sweater on Amazon/ });
    await expect(ordinaryLink).toBeVisible();
    await expect(ordinaryLink).toHaveAttribute('href', 'https://www.amazon.com/dp/B0ABC12345');
    await expect(ordinaryLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('.review-story__final-cta .affiliate-disclosure')).toHaveCount(0);
  }
  for (const mode of ['noFind', 'unavailable']) {
    await page.evaluate(
      (value) =>
        (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(value),
      mode,
    );
    await expect(page.getByRole('link', { name: /Shop this sweater on Amazon/ })).toHaveCount(0);
  }
  await page.evaluate(() =>
    (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
      'noVerdict',
    ),
  );
  await expect(page.locator('.review-story__final-verdict')).toHaveCount(0);
  await expect(page.locator('.review-story__section:has(#review-finalTake)')).toContainText(
    'Final copy',
  );
  await page.evaluate(() =>
    (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview(
      'noAcquisition',
    ),
  );
  await expect(page.locator('.review-story__acquisition')).toHaveCount(0);
});
test('long editorial copy wraps without clipping at narrow width and 200% text size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('**/review-layout-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><body><div id="fixture"></div></body></html>',
    }),
  );
  await page.goto('/review-layout-fixture');
  await page.addStyleTag({
    content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
  });
  await page.addScriptTag({ content: fixture });
  await page.evaluate(() =>
    (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview('long'),
  );
  await expect(page.locator('.review-story__final-verdict')).toContainText('sizing reservations');
  await expect(page.locator('.review-story__first-impression')).toContainText(
    'First impressions copy',
  );
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
for (const [width, height] of [
  [320, 900],
  [375, 900],
  [768, 900],
  [1024, 900],
  [1280, 1200],
  [1280, 1600],
  [1440, 1000],
  [1920, 1200],
]) {
  test(`Review hero, full-width Fit Check and sections remain readable at ${width}×${height}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.route('**/review-layout-fixture', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<html lang="en"><head><title>Review layout check</title></head><body><div id="fixture"></div></body></html>',
      }),
    );
    await page.goto('/review-layout-fixture');
    await page.addStyleTag({
      content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
    });
    await page.addScriptTag({ content: fixture });
    await page.evaluate(() =>
      (window as unknown as { renderReview: (mode: string) => Promise<void> }).renderReview('fit'),
    );
    await expect(page.getByRole('heading', { name: 'The Shannequin Fit Check.' })).toBeVisible();
    await expect(
      page.locator('.review-story__hero-copy .review-story__first-impression'),
    ).toBeVisible();
    await expect(page.locator('.review-story > .fit-check')).toBeVisible();
    await expect(page.locator('.review-story__lower .review-story__sections')).toBeVisible();
    await expect(page.locator('.fit-check__verdict-text')).toHaveText([
      'Runs small',
      'Appears loose',
    ]);
    await expect(page.getByText('Stretch: 2/5 — Slight stretch')).toBeVisible();
    await expect(page.locator('.review-story__hero-copy')).not.toContainText('Stretch: 2/5');
    await expect(page.locator('.review-story__fit-summary')).toHaveCount(0);
    await expect(page.locator('.fit-check__highlights li')).toHaveText([
      'Snug waistband',
      'Bust-friendly',
    ]);
    expect(
      await page
        .locator('.fit-check__highlights li')
        .first()
        .evaluate((item) => getComputedStyle(item, '::before').content),
    ).toContain('—');
    await expect(page.locator('.review-shannequin blockquote')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Shop this sweater on Amazon/ })).toHaveAttribute(
      'data-placement',
      'review',
    );
    await expect(page.getByRole('link', { name: /Shop this sweater on Amazon/ })).toHaveAttribute(
      'data-amazon-product',
      'B0ABC12345',
    );
    await expect(page.locator('.review-story__media')).toHaveCSS('position', 'static');
    const gallery = await page.locator('.review-story__media').boundingBox();
    expect(gallery && gallery.width <= width).toBeTruthy();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
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
