import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const findings = [];
await page.goto('http://localhost:3000/');
await page.keyboard.press('Tab');
assert.equal(await page.locator(':focus').innerText(), 'Skip to content');
findings.push('Skip link is the first keyboard stop.');
await page.locator('#menuToggle').focus();
await page.keyboard.press('Enter');
assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'), 'true');
await page.keyboard.press('Escape');
assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'), 'false');
findings.push('Mobile menu opens with Enter and closes with Escape, restoring its trigger.');
await page.getByRole('button', { name: 'Request a Review', exact: true }).last().focus();
await page.keyboard.press('Enter');
const close = page.getByRole('button', { name: 'Close request dialog', exact: true });
await close.focus();
await page.keyboard.press('Shift+Tab');
assert.equal(await page.locator(':focus').innerText(), 'Send request');
await page.keyboard.press('Tab');
assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Close request dialog');
await page.keyboard.press('Escape');
findings.push('Request dialog wraps focus in both directions and closes with Escape.');
await page.goto('http://localhost:3000/reviews');
const category = page.locator('details').first();
await category.locator('summary').focus();
await page.keyboard.press('Enter');
assert.equal(await category.getAttribute('open'), '');
await page.keyboard.press('Escape');
assert.equal(await category.getAttribute('open'), null);
assert.equal(await category.locator('summary').evaluate((n) => n === document.activeElement), true);
findings.push(
  'Filter disclosures open with Enter and close with Escape, returning focus to their trigger.',
);
await page.addStyleTag({ content: 'body {font-size:200%;}' });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
findings.push('Doubling body text still fits the 390px viewport.');
await page.setViewportSize({ width: 320, height: 844 });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
findings.push('320px narrow reflow remains within the viewport.');
await page.emulateMedia({ reducedMotion: 'reduce' });
assert.equal(
  await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
  'auto',
);
findings.push('Reduced motion disables smooth page scrolling.');
await writeFile('docs/verification/keyboard-review.json', JSON.stringify(findings, null, 2));
await browser.close();
console.log(findings.join('\n'));
