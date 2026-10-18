import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ProductGrid} from './components/ProductGrid';const item={_id:'carousel-test',_type:'product',title:'Test jeans',slug:'test-jeans',description:'A pair of jeans.',photos:Array.from({length:8},(_,i)=>({alt:'Jeans view '+(i+1)}))};createRoot(document.getElementById('fixture')).render(<><h1>Product carousel check</h1><ProductGrid items={[item,{...item,_id:'single',title:'Single photo',photos:[item.photos[0]]},{...item,_id:'missing',title:'No photo',photos:[]}]}/></>);`,
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
        name: 'isolated-product-images',
        setup(builder) {
          builder.onResolve(
            { filter: /^(next\/link|next-sanity)$|^\.\/ContentImage$/ },
            (args) => ({ path: args.path, namespace: 'fixture' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            resolveDir: process.cwd(),
            loader: 'tsx',
            contents:
              args.path === 'next/link'
                ? `export default function Link(props){return <a {...props}/>}`
                : args.path === 'next-sanity'
                  ? `export const stegaClean=value=>value;`
                  : `export function ContentImage({image,width,height}){return image?<img src='/img/empty.jpg' alt={image.alt} width={width} height={height}/>:<div className='image-placeholder' role='img' aria-label='Photograph awaiting publication'/>;}`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
for (const width of [1440, 390]) {
  test(`product galleries cap photos, support dots, keyboard and swipe at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/product-carousel-fixture', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<html lang="en"><head><title>Product galleries</title></head><body><main id="fixture" class="container"></main></body></html>',
      }),
    );
    await page.goto('/product-carousel-fixture');
    await page.addStyleTag({
      content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
    });
    await page.addScriptTag({ content: fixture });
    const cards = page.locator('.product-card');
    const card = cards.first();
    const track = card.locator('.card-slider__track');
    const dots = card.locator('.card-slider__dot');
    await expect(card.locator('.card-slider__slide')).toHaveCount(5);
    await expect(dots).toHaveCount(5);
    await expect(cards.nth(1).locator('.card-slider__dot')).toHaveCount(0);
    await expect(cards.nth(2).getByRole('img')).toHaveAccessibleName(
      'Photograph awaiting publication',
    );
    await dots.nth(3).click();
    await expect(dots.nth(3)).toHaveAttribute('aria-pressed', 'true');
    await expect(
      card.getByRole('link', { name: 'View Test jeans, image 4', exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/product-carousel-fixture$/);
    await track.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(dots.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('End');
    await expect(dots.nth(4)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Home');
    await expect(dots.nth(0)).toHaveAttribute('aria-pressed', 'true');
    expect(await track.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('solid');
    await dots.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(dots.nth(1)).toBeFocused();
    await expect(dots.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(dots.first()).toBeFocused();
    await expect(dots.first()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('End');
    await expect(dots.last()).toBeFocused();
    await expect(dots.last()).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Home');
    await expect(dots.first()).toBeFocused();
    await expect(dots.first()).toHaveAttribute('aria-pressed', 'true');
    if (width === 390) {
      const bounds = (await track.boundingBox())!;
      const session = await page.context().newCDPSession(page);
      const y = bounds.y + bounds.height / 2;
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: bounds.x + bounds.width - 25, y }],
      });
      for (let step = 1; step <= 6; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: bounds.x + bounds.width - 25 - ((bounds.width - 50) * step) / 6, y }],
        });
        await page.waitForTimeout(25);
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect
        .poll(() => track.evaluate((node) => node.scrollLeft))
        .toBeGreaterThan(bounds.width / 2);
      await session.detach();
    }
    await card.getByRole('button', { name: 'Save Test jeans to wishlist', exact: true }).click();
    await expect(
      card.getByRole('button', { name: 'Remove Test jeans from wishlist', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/product-carousel-fixture$/);
    for (const dot of await dots.all()) {
      const size = (await dot.boundingBox())!;
      expect(size.width).toBeGreaterThanOrEqual(24);
      expect(size.height).toBeGreaterThanOrEqual(24);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await dots.first().click();
    await page.route('**/shop/test-jeans', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Test jeans details</h1>' }),
    );
    await card.getByRole('link', { name: 'View Test jeans, image 1', exact: true }).click();
    await expect(page).toHaveURL(/\/shop\/test-jeans$/);
  });
}
