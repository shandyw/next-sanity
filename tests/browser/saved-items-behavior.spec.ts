import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

let reviewFixture: string;
test.beforeAll(async () => {
  const bundle = await build({
    stdin: {
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { WishlistButton } from './components/WishlistButton'; createRoot(document.getElementById('fixture')).render(<WishlistButton id="review-fixture" title="Fixture Review" />);`,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    plugins: [{
      name: 'heart',
      setup(builder) {
        builder.onResolve({ filter: /^\.\/WishlistHeart$/ }, () => ({ path: 'heart', namespace: 'mock' }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const WishlistHeart = () => null;', loader: 'tsx' }));
      },
    }],
  });
  reviewFixture = bundle.outputFiles[0].text;
});

test('Review save button uses keyboard and reports failed browser writes honestly', async ({ page }) => {
  await page.route('**/review-save-fixture', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html lang="en"><body><div id="fixture"></div></body></html>' }),
  );
  await page.goto('/review-save-fixture');
  await page.addScriptTag({ content: reviewFixture });
  const save = page.getByRole('button', { name: 'Save item: Fixture Review' });
  await expect(save).toBeEnabled();
  await save.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Remove from saved items: Fixture Review' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new Error('quota'); };
  });
  await page.getByRole('button', { name: 'Remove from saved items: Fixture Review' }).click();
  await expect(page.getByRole('button', { name: 'Remove from saved items: Fixture Review' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('could not save this change');
});

test('Look Saved Items synchronize across tabs and can be cleared with keyboard focus', async ({ page, context }) => {
  await page.goto('/shop');
  const look = page.locator('.look-card').first();
  test.skip((await look.count()) === 0, 'No published Look in this dataset.');
  const title = await look.locator('h2').innerText();
  await look.getByRole('button', { name: /Save item/ }).click();
  const second = await context.newPage();
  await second.goto('/wishlist');
  await expect(second.getByRole('link', { name: title })).toBeVisible();
  const remove = second.getByRole('button', { name: `Remove ${title} from saved items` });
  await remove.focus();
  await second.keyboard.press('Enter');
  await expect(second.getByRole('link', { name: title })).toHaveCount(0);
  await expect(look.getByRole('button', { name: /Save item/ })).toHaveAttribute('aria-pressed', 'false');
  await look.getByRole('button', { name: /Save item/ }).click();
  await expect(second.getByRole('link', { name: title })).toBeVisible();
  await second.getByRole('button', { name: 'Clear saved items' }).focus();
  await second.keyboard.press('Enter');
  await expect(second.getByRole('link', { name: title })).toHaveCount(0);
  await expect(second.locator('#saved-items-heading')).toBeFocused();
  await expect(look.getByRole('button', { name: /Save item/ })).toHaveAttribute('aria-pressed', 'false');
});

test('failed clearing of unavailable saved IDs retains them and gives feedback', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('curvygirlreviews:wishlist:v1', JSON.stringify({ version: 1, ids: ['retired-id'] })));
  await page.goto('/wishlist');
  const clear = page.getByRole('button', { name: 'Clear unavailable items' });
  await expect(clear).toBeVisible();
  await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new Error('blocked'); }; });
  await clear.click();
  await expect(page.getByRole('status')).toContainText('could not clear these items');
  await expect(clear).toBeVisible();
});
