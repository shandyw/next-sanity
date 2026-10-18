import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
test.use({ hasTouch: true });
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ShannequinMeasurements,ShannequinMeasurementList} from './components/ShannequinMeasurements';
  createRoot(document.getElementById('fixture')).render(<main><section className="container shannequin shannequin--measurements"><div className="shannequin__copy"><h1>Meet Shannequin</h1><p>Existing introduction remains intact.</p><ShannequinMeasurementList measurements={{waist:{value:38,unit:'in'},arm:{value:32,unit:'cm'}}}/></div><div className="shannequin__media"><ShannequinMeasurements hasImage measurements={{waist:{value:38,unit:'in',description:'Development fixture only. Around the natural waist.'},arm:{value:32,unit:'cm',description:'Upper-arm circumference.'}}}><img alt="Development fixture for hotspot geometry" width="700" height="1000" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='1000'%3E%3Crect width='700' height='1000' fill='%23f5c1cb'/%3E%3C/svg%3E"/></ShannequinMeasurements></div></section><button>Outside control</button></main>);`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  fixture = result.outputFiles[0].text;
});
for (const width of [1440, 1024, 390, 320]) {
  test(`measurement controls and dismissal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.route('**/measurement-fixture', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<html lang="en"><head><title>Measurements</title></head><body><div id="fixture"></div></body></html>',
      }),
    );
    await page.goto('/measurement-fixture');
    await page.addStyleTag({
      content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
    });
    await page.addScriptTag({ content: fixture });
    const buttons = page.locator('.measurement-hotspot');
    await expect(buttons).toHaveCount(6);
    const waist = page.getByRole('button', { name: 'Show waist measurement' });
    const popup = page.locator('.measurement-popup');
    const image = await page.locator('.measurements__stage img').boundingBox();
    const boxes = await buttons.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThan(image!.x - 22);
      expect(box.y).toBeGreaterThan(image!.y - 22);
      for (let j = i + 1; j < boxes.length; j++) {
        const other = boxes[j];
        expect(
          box.x + box.width <= other.x ||
            other.x + other.width <= box.x ||
            box.y + box.height <= other.y ||
            other.y + other.height <= box.y,
        ).toBeTruthy();
      }
    }
    await waist.focus();
    await expect(popup).toContainText('38 in / 96.5 cm');
    await expect(waist).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await waist.click();
    await expect(popup).toBeVisible();
    await waist.click();
    await expect(popup).toBeHidden();
    await page.getByRole('button', { name: 'Show chest measurement' }).focus();
    await expect(popup).toContainText('Measurement coming soon');
    await page.getByRole('button', { name: 'Outside control' }).click();
    await expect(popup).toBeHidden();
    await page.mouse.move(0, 0);
    await waist.hover();
    await expect(popup).toBeVisible();
    await popup.hover();
    await page.waitForTimeout(250);
    await expect(popup).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(popup).toBeHidden();
    if (width < 768) {
      await waist.tap();
      await expect(popup).toBeVisible();
      await waist.dispatchEvent('pointerleave', { pointerType: 'touch' });
      await expect(popup).toBeVisible();
      await waist.tap();
      await expect(popup).toBeHidden();
      await waist.dispatchEvent('pointerenter', { pointerType: 'touch' });
      await expect(popup).toBeHidden();
    }
    await page.getByText('View all measurements', { exact: true }).click();
    await expect(page.locator('.measurements__all dd')).toHaveCount(6);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await waist.focus();
    await expect(popup).toHaveCSS('animation-name', 'none');
    if (width < 768) {
      expect((await popup.boundingBox())!.y).toBeGreaterThanOrEqual(image!.y + image!.height);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({
      path: `test-results/shannequin-measurements-${width}.png`,
      fullPage: true,
    });
  });
}

test('About measurements remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/about');
  await page.locator('#shannequin').getByText('View all measurements', { exact: true }).click();
  await expect(page.locator('#shannequin .measurements__all dd')).toHaveCount(6);
  await expect(page.locator('#shannequin .measurement-hotspot:visible')).toHaveCount(0);
  await expect(page.locator('#shannequin .shannequin__number')).toHaveCount(0);
  await expect(page.locator('#shannequin')).toContainText('She brings the curves.');
  await context.close();
});
