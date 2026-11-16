import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { WishlistButton } from './components/WishlistButton';
        import { SavedEditorialItems } from './components/SavedEditorialItems';
        import { SavedFindsLink } from './components/SavedFindsLink';
        const ids=['find-sandals','find-unavailable','look-one'];
        const finds=[
          {id:'find-sandals',title:'Wedge Sandals',description:'A warm-weather option.',icon:'/img/product-icons/sandal.svg',unavailable:false,amazonHref:'https://www.amazon.com/dp/B0ABC12345?tag=curvygirl-20',affiliate:true,trackingId:'B0ABC12345'},
          {id:'find-unavailable',title:'Older Boots',icon:'/img/product-icons/boots.svg',unavailable:true,affiliate:false,trackingId:'B0ABC12346'},
        ];
        const looks=[{id:'look-one',title:'Summer Brunch',href:'/looks/summer-brunch',occasion:'Casual',image:<img src='/img/curvy.png' alt='Summer Brunch outfit' />}];
        createRoot(document.getElementById('fixture')).render(<>
          <SavedFindsLink saveableIds={ids}/>
          <div aria-label='First Look'><WishlistButton id='find-sandals' title='Wedge Sandals' kind='find'/></div>
          <div aria-label='Second Look'><WishlistButton id='find-sandals' title='Wedge Sandals' kind='find'/></div>
          <WishlistButton id='look-one' title='Summer Brunch'/>
          <SavedEditorialItems finds={finds} looks={looks}/>
        </>);`,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    plugins: [
      {
        name: 'public-fixture',
        setup(builder) {
          builder.onResolve({ filter: /^(next\/link|@\/lib\/amazon)$/ }, (args) => ({
            path: args.path,
            namespace: 'mock',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'mock' }, (args) => ({
            loader: 'tsx',
            resolveDir: process.cwd(),
            contents:
              args.path === 'next/link'
                ? 'export default function Link(props){return <a {...props}/>;}'
                : `export const AMAZON_DISCLOSURE='As an Amazon Associate I earn from qualifying purchases.';`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});

async function openFixture(page: import('@playwright/test').Page) {
  await page.route('**/saved-items-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><body><div id="fixture"></div></body></html>',
    }),
  );
  await page.goto('/saved-items-fixture');
  await page.addScriptTag({ content: fixture });
}

test('legacy Reviews are ignored and one Find stays synchronized across Looks', async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'curvygirlreviews:wishlist:v1',
      JSON.stringify({ version: 1, ids: ['review-old', 'look-one'] }),
    ),
  );
  await openFixture(page);
  await expect(page.locator('.saved-finds__count')).toHaveText('1');
  await expect(page.getByRole('heading', { name: 'My Looks' })).toBeVisible();
  const viewLook = page.getByRole('link', { name: 'View Summer Brunch Look' });
  await expect(viewLook).toHaveAttribute('href', '/looks/summer-brunch');
  await expect(viewLook.locator('svg.cta-arrow')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'My Finds' })).toHaveCount(0);
  await expect(page.getByText('review-old')).toHaveCount(0);
  const first = page
    .getByLabel('First Look')
    .getByRole('button', { name: 'Save product: Wedge Sandals' });
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(
    page
      .getByLabel('Second Look')
      .getByRole('button', { name: 'Remove product from saved items: Wedge Sandals' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.saved-finds__count')).toHaveText('2');
  await expect(page.getByRole('heading', { name: 'My Finds' })).toBeVisible();
  await expect(page.getByRole('link', { name: /View Wedge Sandals on Amazon/ })).toHaveAttribute(
    'rel',
    'sponsored noopener noreferrer',
  );
  await expect(
    page.getByRole('link', { name: /View Wedge Sandals on Amazon/ }).locator('svg.cta-external'),
  ).toHaveCount(1);
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('curvygirlreviews:wishlist:v1') || '{}').ids as string[],
  );
  expect(stored.filter((id) => id === 'find-sandals')).toHaveLength(1);
  const secondTab = await context.newPage();
  await openFixture(secondTab);
  await secondTab.getByRole('button', { name: 'Remove Wedge Sandals from saved items' }).click();
  await expect(page.locator('.saved-finds__count')).toHaveText('1');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
});

test('unavailable and unpublished Finds remain safe, removable, and excluded from inappropriate CTAs', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'curvygirlreviews:wishlist:v1',
      JSON.stringify({ version: 1, ids: ['find-unavailable', 'find-unpublished'] }),
    ),
  );
  await openFixture(page);
  await expect(page.locator('.saved-finds__count')).toHaveText('1');
  await expect(page.getByText('Currently unavailable')).toBeVisible();
  await expect(page.getByRole('link', { name: /View Older Boots on Amazon/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Older Boots from saved items' }).click();
  await expect(page.locator('.saved-finds__count')).toHaveText('0');
  await expect(page.getByRole('heading', { name: 'My Finds' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear saved items' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#saved-items-heading')).toBeFocused();
});
