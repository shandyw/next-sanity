import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {CurtainReveal} from './components/CurtainReveal';
      const root=createRoot(document.getElementById('fixture'));window.renderReveal=(interactive=true)=>root.render(<CurtainReveal interactive={interactive} leftPosition="40% 30%" leftPhoto={<img src="/img/hero/me2.jpg" alt="First outfit, full-length view"/>} rightPhoto={<img src="/img/hero/mirror.jpg" alt="Second outfit, full-length view"/>}/>);window.renderReveal();`,
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
        name: 'image-fixture',
        setup(b) {
          b.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'image', namespace: 'fixture' }));
          b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            loader: 'tsx',
            resolveDir: process.cwd(),
            contents: `export default function Image(props){return <img {...props}/>}`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
async function open(page: Page, width = 1440, reduced = true) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.route('**/curtain-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><head><title>Curtain test</title></head><body><main><h1>Fitting-room reveal</h1><div id="fixture" style="max-width:720px;margin:auto"></div><div style="height:1600px"></div></main></body></html>',
    }),
  );
  await page.goto('/curtain-fixture');
  await page.addStyleTag({
    content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
  });
  await page.addScriptTag({ content: fixture });
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
}
for (const width of [1440, 390, 320])
  test(`curtain alignment, keyboard endpoints and accessible controls at ${width}px`, async ({
    page,
  }) => {
    await open(page, width);
    const slider = page.getByRole('slider');
    const scene = page.locator('.curtain-reveal__scene');
    const measure = async () => ({
      scene: (await scene.boundingBox())!,
      photo: (await page.locator('.curtain-reveal__photo').nth(1).boundingBox())!,
      fabric: (await page.locator('.curtain-reveal__fabric').boundingBox())!,
      handle: (await slider.boundingBox())!,
    });
    const first = await measure();
    expect(first.photo.x - first.scene.x).toBeCloseTo((first.scene.width * 782) / 1536, 0);
    expect(first.photo.width).toBeCloseTo((first.scene.width * 598) / 1536, 0);
    expect(first.fabric.x - first.photo.x).toBeGreaterThan(0);
    expect(first.fabric.x).toBeLessThan(first.photo.x + first.photo.width / 4);
    expect(first.handle.width).toBeGreaterThanOrEqual(44);
    expect(first.handle.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByText('Pull to reveal')).toBeVisible();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '13');
    await expect(page.getByText('Pull to reveal')).toHaveCount(0);
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuetext', '100% revealed');
    const end = await measure();
    expect(end.fabric.x).toBeGreaterThanOrEqual(end.photo.x + end.photo.width);
    expect(end.handle.x + end.handle.width / 2).toBeCloseTo(end.fabric.x, 0);
    expect(end.fabric.height).toBeCloseTo(first.fabric.height, 1);
    expect(end.fabric.x + end.fabric.width).toBeCloseTo(first.fabric.x + first.fabric.width, 1);
    await page.screenshot({ path: `test-results/curtain-open-${width}.png` });
    await page.getByRole('button', { name: 'Close curtain' }).click();
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    const closed = await measure();
    expect(closed.fabric.x).toBeCloseTo(closed.photo.x, 0);
    await page.getByRole('button', { name: 'Reveal photo' }).click();
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).include('.curtain-reveal').analyze()).violations,
    ).toEqual([]);
    await page.screenshot({ path: `test-results/curtain-closed-${width}.png` });
  });
test('mouse capture drags both ways; cancellation ends the drag', async ({ page }) => {
  await open(page);
  const slider = page.getByRole('slider');
  const bounds = (await slider.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 500, bounds.y + 20, { steps: 10 });
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  const next = (await slider.boundingBox())!;
  await page.mouse.move(next.x + 20, next.y + 20);
  await page.mouse.down();
  await page.mouse.move(next.x - 500, next.y + 20, { steps: 10 });
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  const reset = (await slider.boundingBox())!;
  await page.mouse.move(reset.x + 20, reset.y + 20);
  await page.mouse.down();
  await expect(page.locator('.curtain-reveal')).toHaveAttribute('data-dragging', 'true');
  await slider.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator('.curtain-reveal')).toHaveAttribute('data-dragging', 'false');
});
test('intro tugs once without dismissing instruction; interaction cancels immediately', async ({
  page,
}) => {
  await open(page, 1440, false);
  await expect
    .poll(() => page.locator('.curtain-reveal__fabric').evaluate((el) => el.getAnimations().length))
    .toBe(1);
  await expect(page.getByText('Pull to reveal')).toBeVisible();
  await page.getByRole('slider').focus();
  expect(
    await page.locator('.curtain-reveal__fabric').evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  expect(
    await page.locator('.curtain-reveal__fabric').evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  await expect(page.getByText('Pull to reveal')).toBeVisible();
  await page.getByRole('slider').press('ArrowLeft');
  await expect(page.getByText('Pull to reveal')).toHaveCount(0);
});
test('reduced motion and missing photos retain a static, usable composition', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(1700);
  expect(
    await page
      .locator('.curtain-reveal__scene')
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.evaluate(() =>
    (window as unknown as { renderReveal: (active: boolean) => void }).renderReveal(false),
  );
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(page.locator('.curtain-reveal__frames')).toBeVisible();
  await expect(page.getByText('A fitting-room reveal is coming soon.')).toBeVisible();
});
test('homepage uses new composition; interior pages retain the existing hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.curtain-reveal')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Explore the Reviews' })).toHaveAttribute(
    'href',
    '/reviews',
  );
  await expect(page.locator('.editorial-hero__measure')).toHaveCount(0);
  await page.goto('/about');
  await expect(page.locator('.curtain-reveal')).toHaveCount(0);
  await expect(page.locator('.editorial-hero__collage')).toHaveCount(1);
  await expect(page.locator('.editorial-hero__measure')).toHaveCount(2);
});

test('touch drags horizontally while vertical gestures scroll and cancel capture', async ({
  page,
  context,
}) => {
  await open(page, 390);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const slider = page.getByRole('slider');
  let box = (await slider.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + i * 10, y }],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  await slider.press('Home');
  box = (await slider.boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + 22, y: box.y + 28 }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + 22, y: box.y + 28 - i * 12 }],
    });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(20);
  await expect(page.locator('.curtain-reveal')).toHaveAttribute('data-dragging', 'false');
});

test('intro completes once, retains instruction and does not replay after rerender', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    (window as unknown as { curtainCalls: number }).curtainCalls = 0;
    Element.prototype.animate = function (frames, options) {
      if (this.closest('.curtain-reveal'))
        (window as unknown as { curtainCalls: number }).curtainCalls++;
      return original.call(this, frames, options);
    };
  });
  await open(page, 1440, false);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { curtainCalls: number }).curtainCalls))
    .toBe(2);
  await expect
    .poll(() =>
      page
        .locator('.curtain-reveal__scene')
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await expect(page.getByText('Pull to reveal')).toBeVisible();
  await page.evaluate(() => (window as unknown as { renderReveal: () => void }).renderReveal());
  await page.evaluate(() => scrollTo(0, 1500));
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1700);
  expect(
    await page.evaluate(() => (window as unknown as { curtainCalls: number }).curtainCalls),
  ).toBe(2);
  await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
});

test('pen input uses the same captured horizontal drag', async ({ page, context }) => {
  await open(page);
  const slider = page.getByRole('slider');
  const box = (await slider.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    pointerType: 'pen',
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: x + 180,
    y,
    button: 'left',
    buttons: 1,
    pointerType: 'pen',
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: x + 180,
    y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    pointerType: 'pen',
  });
  expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  await expect(page.locator('.curtain-reveal')).toHaveAttribute('data-dragging', 'false');
});
