import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import AxeBuilder from '@axe-core/playwright';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {LatestVerdicts} from './components/LatestVerdicts';
        const images=[{alt:'Test fixture photograph'},{alt:'Test fixture photograph'}];
        const reviews=Array.from({length:5},(_,i)=>({_id:'fixture-'+i,_type:'review',title:'Fixture review '+(i+1)+(i===2?' with enough words to wrap naturally across several lines':''),slug:'fixture-'+i,excerpt:'Test-only fit notes.',photos:images,format:'written',categories:[{_id:'fixture-category',title:'Fixture category'}],sizeWorn:i===0?'18':undefined,brand:i===0?{_id:'fixture-brand',title:'Fixture label'}:undefined,titleHighlight:i===0?'review':i===2?'missing phrase':undefined}));
        const host=document.querySelector('#trending'); host.removeAttribute('id');host.removeAttribute('aria-labelledby'); const root=createRoot(host); window.renderLatestFixture=(empty)=>root.render(React.createElement(LatestVerdicts,{reviews:empty?[]:reviews})); window.renderLatestFixture(false);`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    plugins: [
      {
        name: 'local-test-images',
        setup(builder) {
          builder.onResolve({ filter: /^next\/link$/ }, () => ({
            path: 'fixture-link',
            namespace: 'test-link',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test-link' }, () => ({
            contents: `import React from 'react';export default function Link(props){return React.createElement('a',props);}`,
            loader: 'jsx',
            resolveDir: process.cwd(),
          }));
          builder.onResolve({ filter: /\/ContentImage$/ }, () => ({
            path: 'fixture-image',
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents: `import React from 'react';export function ContentImage({image,width,height}){return React.createElement('img',{src:'/img/hero/me2.jpg',alt:image.alt,width,height});}`,
            loader: 'jsx',
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
  });
  fixture = result.outputFiles[0].text;
});

for (const width of [1440, 390]) {
  test(`latest feed shows three cards, then a truthful empty state at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const styles = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
    await page.route('**/__latest-fixture', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<html lang="en"><head>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body><main id="main"><h1 class="visually-hidden">Latest feed test fixture</h1><div id="trending"></div></main></body></html>`,
      }),
    );
    await page.goto('/__latest-fixture');
    // Isolated browser fixtures never write Sanity or modify the server's published feed.
    await page.addScriptTag({ content: fixture });
    const section = page.locator('#trending').last();
    await expect(section.locator('.review-card')).toHaveCount(3);
    await expect(section.locator('.latest-empty')).toHaveCount(0);
    await expect(section.getByRole('heading', { name: 'Fixture review 3' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Fixture review 4' })).toHaveCount(0);
    await expect(section.locator('mark')).toHaveCount(0);
    await expect(section.locator('.review-card').first().locator('.review-card__title')).toHaveText(
      'Fixture review 1',
    );
    const title = section.locator('.review-card__title').nth(2);
    expect(await title.evaluate((element) => getComputedStyle(element).overflow)).toBe('visible');
    const titleBounds = await title.boundingBox();
    const firstTitleBounds = await section.locator('.review-card__title').first().boundingBox();
    expect(titleBounds!.height).toBeGreaterThan(firstTitleBounds!.height);
    const excerptBounds = await section.locator('.review-card__blurb').nth(2).boundingBox();
    expect(excerptBounds!.y).toBeGreaterThan(titleBounds!.y + titleBounds!.height);
    await expect(section.locator('.review-card__meta')).toHaveCount(1);
    await expect(section.locator('.review-card__meta')).toHaveText('Tried in size 18');
    await expect(section.locator('.review-card__category')).toHaveCount(0);
    const brand = section.locator('.review-card__brand');
    await expect(brand).toHaveCount(1);
    await expect(brand).toHaveText('Fixture label');
    await expect(brand).toHaveCSS('text-transform', 'uppercase');
    const brandBounds = (await brand.boundingBox())!;
    expect(brandBounds.y + brandBounds.height).toBeLessThanOrEqual(firstTitleBounds!.y);
    const photoControls = section.locator('.card-slider__dots').first();
    await expect(photoControls).toHaveCSS('bottom', '10px');
    const mediaBounds = (await section.locator('.review-card__media').first().boundingBox())!;
    const controlsBounds = (await photoControls.boundingBox())!;
    expect(
      Math.abs(mediaBounds.y + mediaBounds.height - controlsBounds.y - controlsBounds.height - 10),
    ).toBeLessThan(1);
    const dots = section.getByRole('button', { name: 'Show image 2 of Fixture review 1' });
    await dots.focus();
    await page.keyboard.press('Enter');
    await expect(dots).toHaveAttribute('aria-pressed', 'true');
    const axe = await new AxeBuilder({ page })
      .include('.review-grid')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({
      path: `docs/verification/warm-editorial-2026-10-13/review-previews-${width}.png`,
      fullPage: true,
    });
    await page.evaluate(() =>
      (window as unknown as { renderLatestFixture: (empty: boolean) => void }).renderLatestFixture(
        true,
      ),
    );
    await expect(section.locator('.review-card')).toHaveCount(0);
    await expect(section.locator('.latest-empty')).toContainText('Real try-ons are on their way.');
  });
}
