import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
let fixture: string;
test.beforeAll(async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import ProductPage,{generateMetadata} from './app/(site)/shop/[slug]/page';import {AmazonClickTracking} from './components/AmazonClickTracking';
 const root=createRoot(document.getElementById('fixture'));window.events=[];window.addEventListener('cgr:amazon-outbound',e=>window.events.push(e.detail));document.addEventListener('click',e=>{if(e.target.closest('a')?.href.includes('amazon.com')){window.defaultWasPrevented=e.defaultPrevented;e.preventDefault();}});
 window.fixtureSettings={amazonAssociates:{active:false,tag:'site-20'}};
 window.fixtureProduct={_id:'find-asin',_type:'product',title:'A blouse on my radar',slug:'blouse',shoppingSection:'finds',retailer:'Amazon',amazonAsin:'B0C5R6Q2XZ',purchaseUrl:'https://www.amazon.com/dp/B0C5R6Q2XZ?tag=old-20',affiliateLink:true,availability:'sold',listingPrice:22.99,currency:'USD',priceMaintained:true,availableSizes:['16'],description:'COPIED IMPORTED DESCRIPTION',importedImageUrl:'https://m.media-amazon.com/images/I/no-fetch.jpg',photos:[{asset:{_ref:'unverified-photo'},alt:'Unverified photo'}]};
 window.renderProduct=async(active=false,ready=false,mannequin=false)=>{window.fixtureSettings.amazonAssociates.active=active;window.fixtureProduct={...window.fixtureProduct,whyPicked:ready?'I picked this shape to compare with the layering pieces I own.':undefined,whatToCheck:ready?'Check bust and shoulder measurements against the size chart.':undefined,sellerSpecifications:ready?'Seller reports a button-front design.':undefined,editorialReviewedAt:ready?'2026-10-18':undefined,contentReviewStatus:ready?'approved':'needs_review',indexingIntent:ready?'index':'noindex',experienceStatus:mannequin?'mannequin':'curated',fitObservations:mannequin?'Shown on Shannequin only.':undefined,photos:ready?[{asset:{_ref:'owned'},alt:'Original blouse photograph',sourceKind:'original'}]:[{asset:{_ref:'unknown'},alt:'Unverified photo'}]};window.metadata=await generateMetadata({params:Promise.resolve({slug:'blouse'})});root.render(<><AmazonClickTracking enabled/>{await ProductPage({params:Promise.resolve({slug:'blouse'})})}</>);};window.renderProduct();`,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'server-fixtures',
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(next\/link|next\/navigation|next-sanity|@\/lib\/content|@\/lib\/seo|@\/components\/ContentImage|\.\/ContentImage|@\/components\/EditorialHero)$/,
            },
            (a) => ({ path: a.path, namespace: 'mock' }),
          );
          b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
            resolveDir: process.cwd(),
            loader: 'tsx',
            contents:
              a.path === 'next/link'
                ? `export default function Link(props){return <a {...props}/>}`
                : a.path === 'next/navigation'
                  ? `export const notFound=()=>{throw Error('not found')}`
                  : a.path === 'next-sanity'
                    ? `export const stegaClean=v=>v;`
                    : a.path === '@/lib/content'
                      ? `export const getDocument=async()=>window.fixtureProduct;export const getSettings=async()=>window.fixtureSettings;`
                      : a.path === '@/lib/seo'
                        ? `export const pageMetadata=(title,description,path,noindex)=>({title,description,alternates:{canonical:path},robots:{index:!noindex}});export const socialImageUrl=()=>undefined;`
                        : a.path === '@/components/EditorialHero'
                          ? `export function EditorialHero({title}){return <section><h1>{title}</h1></section>}`
                          : `export function ContentImage({image,width,height,className}){return image?<img src='/img/curvy.png' alt={image.alt} className={className} width={width} height={height}/>:<div className='image-placeholder' role='img' aria-label='Photograph awaiting publication'/>;}`,
          }));
        },
      },
    ],
  });
  fixture = bundle.outputFiles[0].text;
});
for (const width of [1440, 390])
  test(`Amazon content, affiliate state and consent at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/amazon-policy-fixture*', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<html lang="en"><head><title>Amazon editorial policy</title></head><body><div id="fixture"></div></body></html>',
      }),
    );
    const amazonRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('m.media-amazon.com')) amazonRequests.push(req.url());
    });
    await page.goto('/amazon-policy-fixture?email=do-not-track@example.test');
    await page.addStyleTag({
      content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
    });
    await page.addScriptTag({ content: fixture });
    const action = page.getByRole('link', { name: /View on Amazon/ }).first();
    await expect(action).toHaveAttribute('href', 'https://www.amazon.com/dp/B0C5R6Q2XZ');
    await expect(page.locator('body')).not.toContainText('COPIED IMPORTED DESCRIPTION');
    await expect(page.locator('body')).not.toContainText('22.99');
    await expect(page.locator('body')).not.toContainText('This item has sold');
    await expect(page.locator('body')).not.toContainText('Available sizes:');
    await expect(page.locator('img')).toHaveCount(0);
    expect(amazonRequests).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { metadata: { robots: { index: boolean } } }).metadata.robots.index,
      ),
    ).toBe(false);
    await action.click();
    expect(
      await page.evaluate(() => (window as unknown as { events: unknown[] }).events.length),
    ).toBe(0);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('cgr:analytics-consent', { detail: { granted: true } })),
    );
    await action.click();
    const events = await page.evaluate(() => {
      const w = window as unknown as {
        events: Record<string, unknown>[];
        defaultWasPrevented: boolean;
      };
      return { events: w.events, defaultWasPrevented: w.defaultWasPrevented };
    });
    expect(events.events[0]).toEqual({
      productId: 'B0C5R6Q2XZ',
      sourcePage: '/amazon-policy-fixture',
      placement: 'product',
      experience: 'curated',
    });
    expect(events.defaultWasPrevented).toBe(false);
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('cgr:analytics-consent', { detail: { granted: false } }),
      ),
    );
    await action.click();
    expect(
      await page.evaluate(() => (window as unknown as { events: unknown[] }).events.length),
    ).toBe(1);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
      window.dispatchEvent(new CustomEvent('cgr:analytics-consent', { detail: { granted: true } }));
    });
    await action.click();
    expect(
      await page.evaluate(() => (window as unknown as { events: unknown[] }).events.length),
    ).toBe(1);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'globalPrivacyControl', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(
        new CustomEvent('cgr:analytics-consent', { detail: { granted: false } }),
      );
    });
    await page.evaluate(() =>
      (
        window as unknown as {
          renderProduct: (active: boolean, ready: boolean, mannequin: boolean) => Promise<void>;
        }
      ).renderProduct(true, true, true),
    );
    await expect(action).toHaveAttribute('rel', /sponsored/);
    await expect(action).toHaveAttribute('href', /tag=site-20/);
    await expect(page.locator('body')).toContainText('As an Amazon Associate');
    await expect(page.getByRole('heading', { name: 'Why I picked it' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Seller-reported specifications' }),
    ).toBeVisible();
    await expect(page.locator('body')).toContainText('does not establish human comfort');
    await expect(page.getByRole('img', { name: 'Original blouse photograph' })).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { metadata: { robots: { index: boolean } } }).metadata.robots.index,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({ path: `test-results/amazon-editorial-${width}.png`, fullPage: true });
  });
