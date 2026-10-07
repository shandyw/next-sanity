import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
await mkdir('docs/verification', { recursive: true });
const findings = [];
for (const width of [1440, 390])
  for (const route of ['/', '/about/', '/reviews/']) {
    const measurements = [];
    for (const [label, origin] of [
      ['before', 'http://127.0.0.1:4173'],
      ['after', 'http://127.0.0.1:3000'],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(origin + route);
      await page.waitForTimeout(1500);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.getBoundingClientRect().toJSON(),
        font:
          document.querySelector('h1') && getComputedStyle(document.querySelector('h1')).fontFamily,
        hero: document.querySelector('.hero')?.getBoundingClientRect().toJSON(),
        header: document.querySelector('.site-header')?.getBoundingClientRect().toJSON(),
        bodyWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      measurements.push({ label, ...result });
      await page.screenshot({
        path: `docs/verification/${label}-${route === '/' ? 'home' : route.replaceAll('/', '')}-${width}.png`,
        fullPage: true,
      });
      await page.close();
    }
    findings.push({ width, route, measurements });
  }
await writeFile('docs/verification/layout-measurements.json', JSON.stringify(findings, null, 2));
await browser.close();
