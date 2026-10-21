import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ThemeProvider,studioTheme} from '@sanity/ui';import {ReviewWishlistTool} from './sanity/review-wishlist/ReviewWishlistTool';createRoot(document.getElementById('fixture')).render(<ThemeProvider theme={studioTheme}><ReviewWishlistTool/></ThemeProvider>);`,
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
        name: 'studio-fixture',
        setup(b) {
          b.onResolve({ filter: /^sanity(\/router)?$/ }, (a) => ({
            path: a.path,
            namespace: 'mock',
          }));
          b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({
            loader: 'tsx',
            resolveDir: process.cwd(),
            contents:
              a.path === 'sanity/router'
                ? `import React from 'react';export const IntentLink=({params,intent,children,...props})=><a {...props} href={'/studio/structure/product;'+(params.id||'new')}>{children}</a>;`
                : `
const docs=[];window.testWishlistDocs=docs;const client={withConfig:()=>client,fetch:async(q,p)=>q.includes("references(")?[]:p.ids?docs.filter(d=>p.ids.includes(d._id)):docs.filter(d=>d._id>p.after).sort((a,b)=>a._id.localeCompare(b._id)).slice(0,200),create:async d=>{docs.push({...d,_rev:'r'});},patch:id=>{const fields={};const patch={ifRevisionId:()=>patch,set:f=>{Object.assign(fields,f);return patch;},commit:async()=>{Object.assign(docs.find(d=>d._id===id),fields);}};return patch;}};
client.action=async a=>{const draft=docs.find(d=>d._id===a.draftId),pub=docs.find(d=>d._id===a.publishedId);if(a.actionType.endsWith('.publish')){const saved={...draft,_id:a.publishedId,_rev:'published'};docs.splice(0,docs.length,...docs.filter(d=>d._id!==a.draftId&&d._id!==a.publishedId),saved);}else{docs.splice(docs.indexOf(pub),1);docs.push({...pub,_id:a.draftId,_rev:'unpublished'});}};
client.transaction=()=>{const ops=[];const tx={patch:(id,cb)=>{const p={ifRevisionId:()=>p,set:()=>p};cb(p);return tx;},create:d=>{ops.push(()=>docs.push({...d,_rev:'new'}));return tx;},delete:id=>{ops.push(()=>docs.splice(docs.findIndex(d=>d._id===id),1));return tx;},commit:async()=>ops.forEach(fn=>fn())};return tx;};
export const useClient=()=>client;export const useWorkspace=()=>({});export const useCurrentUser=()=>({id:'editor'});export const validateDocument=async()=>[];`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
for (const width of [1440, 390])
  test(`CSV creates finds, publishes, marks received and deletes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route('**/wishlist-tool-fixture', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<html lang="en"><head><title>Wishlist importer</title></head><body><main id="fixture"></main></body></html>',
      }),
    );
    await page.goto('/wishlist-tool-fixture');
    await page.addStyleTag({
      content: readFileSync('node_modules/@sanity/ui/dist/styles.css', 'utf8'),
    });
    await page.addScriptTag({ content: fixture });
    await expect(page.getByText('No wishlist items yet.', { exact: false })).toBeVisible();
    const csv =
      'Name,Price,Rating,Product URL,Image URL,Date Added,Priority,Needs,Has,Comment\nBlue blouse,$22,4.4,https://www.amazon.com/dp/B0C5R6Q2XZ/,https://m.media-amazon.com/images/I/test.jpg,2026-10-17,medium,1,0,Check fit';
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'amazon.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await expect(page.getByText('Preview: 1 items', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Import drafts', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Curated Finds saved as drafts');
    const docs = await page.evaluate(
      () => (window as unknown as { testWishlistDocs: Record<string, unknown>[] }).testWishlistDocs,
    );
    expect(docs[0].shoppingSection).toBe('finds');
    expect(docs[0]._type).toBe('product');
    expect(docs[0].onReviewWishlist).toBe(true);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Set to Draft', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark received', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mark wanted', exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Publish to update');
    await page.getByRole('button', { name: 'Delete item', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edit', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete item', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('No wishlist items yet.', { exact: false })).toBeVisible();
  });
test('support separates gift configuration from suggestions and catalog wishes', async ({
  page,
}) => {
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Suggest something' })).toBeVisible();
  await expect(page.locator('#review-wishlist-title')).toHaveText('My Review Wishlist');
  const gift = page.locator('.support-choice--gift a');
  if (await gift.count()) await expect(gift).toHaveAttribute('href', /^https:\/\/(www\.)?amazon\./);
  else await expect(page.locator('.support-choice__unavailable')).toBeVisible();
  await page.locator('.support-choice--request button').click();
  await expect(page.getByRole('link', { name: 'View My Review Wishlist' })).toHaveAttribute(
    'href',
    '/support#review-wishlist',
  );
  await page.keyboard.press('Escape');
  await page.goto('/my-wishlist');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My Review Wishlist');
});
