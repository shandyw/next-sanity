import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {LeadModal} from './components/LeadModal'; createRoot(document.getElementById('root')).render(React.createElement(LeadModal,{content:{enabled:true},image:React.createElement('img',{src:'/img/mirror.jpg',alt:''})}));`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    define: { 'process.env': '{}' },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
  });
  fixture = result.outputFiles[0].text;
});
async function setup(page: import('@playwright/test').Page, width: number) {
  await page.clock.install({ time: new Date('2026-11-11T12:00:00Z') });
  await page.setViewportSize({ width, height: 800 });
  await page.route('**/lead-trigger-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><button data-open-lead>Get updates</button><div id="spacer" style="height:2400px"></div><div id="root"></div></body></html>',
    }),
  );
  await page.goto('/lead-trigger-fixture');
  await page.addScriptTag({ content: fixture });
  await expect(page.locator('.lead-dialog')).toHaveCount(1);
}

test('desktop waits 20 seconds and half-page scroll, then shows once', async ({ page }) => {
  await setup(page, 1440);
  await page.evaluate(() => scrollTo(0, 1000));
  await page.clock.fastForward(19_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.clock.fastForward(1_000);
  await expect(page.locator('.lead-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.clock.fastForward(30_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.reload();
  await page.addScriptTag({ content: fixture });
  await page.evaluate(() => scrollTo(0, 1000));
  await page.clock.fastForward(30_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Get updates' }).click();
  await expect(page.locator('.lead-dialog')).toBeVisible();
});

test('desktop exit intent is eligible only after 20 seconds', async ({ page }) => {
  await setup(page, 1440);
  await page.clock.fastForward(20_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.mouse.move(400, 200);
  await page.mouse.move(400, 5);
  await page.mouse.move(400, -2);
  await expect(page.locator('.lead-dialog')).toBeVisible();
});

test('scrolling halfway before twenty seconds is remembered across a return to the top', async ({
  page,
}) => {
  await setup(page, 1440);
  await page.evaluate(() => scrollTo(0, 1000));
  await page.clock.fastForward(300);
  await page.evaluate(() => scrollTo(0, 0));
  await page.clock.fastForward(19_700);
  await expect(page.locator('.lead-dialog')).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`a short page does not prompt at twenty seconds without scrolling at ${width}px`, async ({ page }) => {
    await setup(page, width);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('#spacer')!.style.height = '100px';
      scrollTo(0, 0);
    });
    await page.clock.fastForward(20_000);
    await expect(page.locator('.lead-dialog')).not.toBeVisible();
    await expect(page.locator('.lead-banner')).not.toBeVisible();
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('#spacer')!.style.height = '2400px';
      scrollTo(0, 1000);
    });
    await page.clock.fastForward(300);
    await expect(page.locator(width < 800 ? '.lead-banner' : '.lead-dialog')).toBeVisible();
  });
}

test('mobile banner does not steal focus; CTA opens modal and closing starts cooldown', async ({
  page,
}) => {
  await setup(page, 390);
  await page.getByRole('button', { name: 'Get updates' }).focus();
  await page.evaluate(() => scrollTo(0, 1000));
  await page.clock.fastForward(20_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Newsletter invitation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get updates' })).toBeFocused();
  await page.getByRole('button', { name: "I'm In!" }).click();
  await expect(page.locator('.lead-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Newsletter invitation' }),
  ).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('curvygirlreviews:lead:dismissed:v2')))
    .toBe(true);
});

test('typing and another dialog defer the prompt', async ({ page }) => {
  await setup(page, 1440);
  await page.evaluate(() => {
    const input = document.createElement('input');
    document.body.prepend(input);
    input.focus();
    scrollTo(0, 1000);
  });
  await page.clock.fastForward(20_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await page.clock.fastForward(300);
  await expect(page.locator('.lead-dialog')).toBeVisible();
});

test('mobile dismissal persists for fourteen days and suppression survives a resize', async ({
  page,
}) => {
  await setup(page, 390);
  await page.evaluate(() => scrollTo(0, 1000));
  await page.clock.fastForward(20_000);
  const banner = page.getByRole('complementary', { name: 'Newsletter invitation' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Dismiss newsletter invitation' }).click();
  await expect(banner).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.clock.fastForward(30_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('curvygirlreviews:lead:dismissed:v2')))
    .toBe(true);
});

test('another dialog, playing video, and recent Amazon click defer an eligible prompt', async ({
  page,
}) => {
  await setup(page, 1440);
  await page.evaluate(() => {
    const other = document.createElement('dialog');
    other.id = 'other';
    document.body.append(other);
    other.showModal();
    scrollTo(0, 1000);
  });
  await page.clock.fastForward(20_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.evaluate(() => {
    document.querySelector<HTMLDialogElement>('#other')?.close();
    const video = document.createElement('video');
    video.id = 'playing-video';
    Object.defineProperty(video, 'paused', { value: false });
    document.body.append(video);
  });
  await page.clock.fastForward(500);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.evaluate(() => {
    document.querySelector('#playing-video')?.remove();
    const anchor = document.createElement('a');
    anchor.href = 'https://www.amazon.com/dp/B0GQGBJQL7';
    anchor.dataset.amazonProduct = 'find';
    anchor.addEventListener('click', (event) => event.preventDefault());
    document.body.append(anchor);
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await page.clock.fastForward(2500);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.clock.fastForward(800);
  await expect(page.locator('.lead-dialog')).toBeVisible();
});

test('an in-progress client route change defers the prompt until the URL changes', async ({
  page,
}) => {
  await setup(page, 1440);
  await page.evaluate(() => scrollTo(0, 1000));
  await page.clock.fastForward(19_000);
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '/next-page';
    link.textContent = 'Next page';
    link.addEventListener('click', (event) => event.preventDefault());
    document.body.append(link);
    link.click();
  });
  await page.clock.fastForward(2_000);
  await expect(page.locator('.lead-dialog')).not.toBeVisible();
  await page.evaluate(() => history.pushState({}, '', '/next-page'));
  await page.clock.fastForward(600);
  await expect(page.locator('.lead-dialog')).toBeVisible();
});
