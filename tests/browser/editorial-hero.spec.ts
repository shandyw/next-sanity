import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectPrimaryColor(element: Locator) {
  const colors = await element.evaluate((node) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--color-primary)';
    document.body.append(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    return { actual: getComputedStyle(node).color, expected };
  });
  expect(colors.actual).toBe(colors.expected);
}

type AnimationCall = { part: string | null; delay: number; duration: number; frames: Keyframe[] };

declare global {
  interface Window {
    heroAnimationCalls: AnimationCall[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const scope = window;
    scope.heroAnimationCalls = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.closest('.editorial-hero') && !this.closest('.curtain-reveal')) {
        const timing = typeof options === 'object' ? options : { duration: options };
        scope.heroAnimationCalls.push({
          part: this.getAttribute('data-hero-part'),
          delay: Number(timing?.delay || 0),
          duration: Number(timing?.duration || 0),
          frames: frames as Keyframe[],
        });
      }
      return animate.call(this, frames, options);
    };
  });
});

test('desktop assembly timings, once-only playback and keyboard CTA', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const hero = page.locator('.editorial-hero');
  await expect.poll(() => page.evaluate(() => window.heroAnimationCalls.length)).toBe(4);
  const calls = await page.evaluate(() => window.heroAnimationCalls);
  expect(calls.map(({ part, delay, duration }) => [part, delay, duration])).toEqual([
    ['eyebrow', 160, 400],
    ['heading', 160, 400],
    ['description', 450, 350],
    ['action', 450, 350],
  ]);
  expect(calls.some((call) => call.part === 'highlight')).toBe(false);
  const overflowDuringEntrance = await page.evaluate(async () => {
    const end = performance.now() + 1100;
    let overflow = false;
    while (performance.now() < end) {
      overflow ||= document.documentElement.scrollWidth > innerWidth;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return overflow;
  });
  expect(overflowDuringEntrance).toBe(false);
  await expect
    .poll(() => hero.evaluate((element) => element.getAnimations({ subtree: true }).length))
    .toBe(0);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await hero.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.heroAnimationCalls.length)).toBe(4);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const cta = hero.getByRole('link', { name: 'Explore the Reviews' });
  await cta.hover();
  await expect
    .poll(() =>
      hero
        .locator('.editorial-hero__cta-arrow')
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe('matrix(1, 0, 0, 1, 4, 0)');
  await cta.focus();
  await expect(cta).toBeFocused();
  expect(await cta.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  const axe = await new AxeBuilder({ page })
    .include('.editorial-hero')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);
  await page.screenshot({ path: 'test-results/editorial-hero-desktop.png' });
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/reviews$/);
});

for (const width of [390, 320]) {
  test(`mobile ${width}px fades without travel and emphasis stays readable without a background`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => window.heroAnimationCalls.length)).toBe(1);
    const calls = await page.evaluate(() => window.heroAnimationCalls);
    expect(calls[0].duration).toBe(300);
    expect(calls[0].frames).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    await expect(page.locator('.editorial-hero__highlight')).toHaveCount(0);
    await expectPrimaryColor(page.locator('.editorial-hero__emphasis'));
    await expect(page.locator('.editorial-hero__accent-text')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect
      .poll(() =>
        page
          .locator('.editorial-hero')
          .evaluate((element) => element.getAnimations({ subtree: true }).length),
      )
      .toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const axe = await new AxeBuilder({ page })
      .include('.editorial-hero')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((violation) => violation.id)).toEqual([]);
    await page.screenshot({ path: `test-results/editorial-hero-${width}.png` });
  });
}

test('reduced motion skips entrance and arrow movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('.editorial-hero');
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
  await hero.getByRole('link', { name: 'Explore the Reviews' }).hover();
  expect(await page.evaluate(() => window.heroAnimationCalls)).toEqual([]);
  expect(
    await hero
      .locator('.editorial-hero__cta-arrow')
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe('none');
});

test('without JavaScript the complete composition and real review link remain available', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  const hero = page.locator('.editorial-hero');
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(hero.locator('.editorial-hero__highlight')).toHaveCount(0);
  await expectPrimaryColor(hero.locator('.editorial-hero__emphasis'));
  await expect(hero.locator('.curtain-reveal__frames')).toBeVisible();
  const link = hero.getByRole('link', { name: 'Explore the Reviews' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/reviews');
  await context.close();
});
