import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import AxeBuilder from '@axe-core/playwright';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { HeroBackgroundVideo } from './components/HeroBackgroundVideo';
        createRoot(document.getElementById('video-host')).render(React.createElement('section', { className: 'editorial-hero editorial-hero--video', 'data-copy-tone': 'dark' },
          React.createElement(HeroBackgroundVideo, { src: '/videos/smiling-woman-posing-in-front-of-clothing-rack-2026-10-03-03-59-46-utc.mp4' }),
          React.createElement('div', { className: 'container editorial-hero__inner' },
            React.createElement('div', { className: 'editorial-hero__copy' },
              React.createElement('h1', null, 'Video hero'), React.createElement('p', { className: 'editorial-hero__intro' }, 'Readable copy')))));`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
  });
  fixture = result.outputFiles[0].text;
});

async function openFixture(page: import('@playwright/test').Page) {
  await page.goto('/');
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href),
  );
  const inline = await page.locator('style').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent ?? ''),
  );
  await page.route('**/__hero-video-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html lang="en"><head>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}${inline.map((css) => `<style>${css}</style>`).join('')}</head><body><main id="video-host"></main><div style="height:200vh"></div></body></html>`,
    }),
  );
  await page.goto('/__hero-video-fixture');
  await page.addScriptTag({ content: fixture });
  return page.locator('.editorial-hero--video');
}

test('video hero plays silently while visible, pauses offscreen, and supports both copy tones', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playCount = String(Number(this.dataset.playCount || 0) + 1);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      this.dataset.pauseCount = String(Number(this.dataset.pauseCount || 0) + 1);
    };
  });
  const hero = await openFixture(page);
  const video = hero.locator('video');
  expect(await video.evaluate((node: HTMLVideoElement) => node.muted)).toBe(true);
  await expect(video).toHaveAttribute('loop', '');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute('aria-hidden', 'true');
  await expect(hero.locator('img')).toHaveCount(0);
  await expect.poll(() => video.getAttribute('data-play-count')).toBe('1');
  expect(await hero.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(440);
  await expect(hero.locator('.editorial-hero__copy')).toHaveCSS('color', 'rgb(255, 255, 255)');
  const darkAxe = await new AxeBuilder({ page }).include('.editorial-hero--video').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(darkAxe.violations.map((violation) => violation.id)).toEqual([]);
  await hero.evaluate((node) => { node.dataset.copyTone = 'light'; });
  await expect(hero.locator('.editorial-hero__copy')).toHaveCSS('color', 'rgb(17, 21, 28)');
  const lightAxe = await new AxeBuilder({ page }).include('.editorial-hero--video').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(lightAxe.violations.map((violation) => violation.id)).toEqual([]);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => video.getAttribute('data-pause-count')).toBe('1');
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => video.getAttribute('data-play-count')).toBe('2');
});

test('reduced motion prevents decorative video autoplay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dataset.playCount = String(Number(this.dataset.playCount || 0) + 1);
      return Promise.resolve();
    };
  });
  const hero = await openFixture(page);
  await expect(hero.locator('video')).toBeVisible();
  await expect(hero.locator('video')).not.toHaveAttribute('data-play-count');
});

test('unavailable video falls back to the cream hero background', async ({ page }) => {
  const hero = await openFixture(page);
  const video = hero.locator('video');
  await video.dispatchEvent('error');
  await expect(video).toHaveAttribute('data-load-error', 'true');
  await expect(video).toBeHidden();
  await expect(hero).toHaveCSS('background-color', 'rgb(255, 240, 245)');
  await expect(hero.getByRole('heading', { name: 'Video hero' })).toBeVisible();
});
