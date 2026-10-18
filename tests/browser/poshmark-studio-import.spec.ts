import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ThemeProvider,studioTheme} from '@sanity/ui';import {PoshmarkImport} from './sanity/imports/PoshmarkImport';createRoot(document.getElementById('fixture')).render(<ThemeProvider theme={studioTheme}><PoshmarkImport onImported={()=>window.refreshed=true}/></ThemeProvider>);`,
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
        name: 'studio-client',
        setup(builder) {
          builder.onResolve({ filter: /^sanity$/ }, () => ({
            path: 'sanity',
            namespace: 'fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            loader: 'tsx',
            contents: `
    const docs=[{_id:'owned',_rev:'r1',_type:'product',title:'Ryka Summit Trail Hiking Boots',sku:'CGR-001',shoppingSection:'closet',saleStatus:'sold',availability:'sold',description:'Editorial text',photos:[{asset:{_ref:'owned'}}]}];window.testDocs=docs;
    const client={withConfig:()=>client,fetch:async(query,p)=>structuredClone(p.cursor!==undefined?docs.filter(d=>d._id>p.cursor).sort((a,b)=>a._id.localeCompare(b._id)):docs.filter(d=>(d.importSource===p.source&&d.externalListingId===p.externalId)||d.poshmarkUrl===p.url||d.purchaseUrl===p.url||p.ids.includes(d._id))),getDocuments:async(ids)=>structuredClone(ids.map(id=>docs.find(d=>d._id===id)||null)),create:async(doc)=>{if(window.failImport)throw Error('Permission denied');docs.push({...doc,_rev:'new'});},patch:(id)=>{let fields;const patch={ifRevisionId:()=>patch,set:(value)=>{fields=value;return patch;},commit:async()=>{if(window.failImport)throw Error('Permission denied');Object.assign(docs.find(d=>d._id===id),fields,{_rev:'new'});}};return patch;},transaction:()=>{let create;const tx={patch:(id,cb)=>{const patch={ifRevisionId:()=>patch,set:()=>patch};cb(patch);return tx;},create:(doc)=>{create=doc;return tx;},commit:async()=>{await client.create(create);}};return tx;}};export const useClient=()=>client;`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
const csv =
  'Inventory Report for @cgrshop\nInventory as of 01/01/2026\n\nListing SKU,Listing Title,Current Listing Price,Size,Listing URL\nSH-001,Ryka Summit Trail Hiking Boots,54,9,https://poshmark.com/listing/Boots-6acf9e893559d52c099ce643\nSH-002,Floral Summer Dress,25,18,\n';
async function open(page: import('@playwright/test').Page, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('**/poshmark-import-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><head><title>Import test</title></head><body><main id="fixture"></main></body></html>',
    }),
  );
  await page.goto('/poshmark-import-fixture');
  await page.addStyleTag({
    content: readFileSync('node_modules/@sanity/ui/dist/styles.css', 'utf8'),
  });
  await page.addScriptTag({ content: fixture });
  await page.getByRole('button', { name: 'Import Poshmark CSV' }).click();
  await page
    .getByLabel('Inventory CSV')
    .setInputFiles({ name: 'inventory.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
}
for (const width of [1440, 390])
  test(`CSV preview, explicit matching, draft-only import and accessible dialog at ${width}px`, async ({
    page,
  }) => {
    await open(page, width);
    await expect(
      page.getByText('Detected headings on row 4. 1 listings need a URL.'),
    ).toBeVisible();
    await page
      .getByLabel(/SH-002: Floral Summer Dress/)
      .fill('https://poshmark.com/listing/Dress-6acf9e893559d52c099ce644');
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('2 listings ready');
    await expect(page.getByLabel('Decision for SH-001')).toHaveValue('skip');
    await expect(page.getByLabel('Decision for SH-002')).toHaveValue('create');
    await page.getByLabel('Decision for SH-001').selectOption('link:owned');
    const confirm = page.getByRole('button', { name: 'Confirm import (2 changes)' });
    await expect(confirm).toBeDisabled();
    const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: `/tmp/poshmark-studio-${width}.png` });
    await page.getByRole('checkbox').focus();
    await page.keyboard.press('Space');
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText(
      'Created 1, updated 1, skipped 0, failed 0',
    );
    const docs = await page.evaluate(
      () => (window as unknown as { testDocs: Record<string, unknown>[] }).testDocs,
    );
    expect(docs.filter((d) => !(d._id as string).startsWith('drafts.'))).toHaveLength(1);
    expect(docs.find((d) => d._id === 'drafts.owned')).toMatchObject({
      sku: 'CGR-001',
      saleStatus: 'sold',
      availability: 'sold',
      description: 'Editorial text',
      title: 'Ryka Summit Trail Hiking Boots',
    });
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import Poshmark CSV' })).toBeFocused();
  });
test('CSV validation and denied saves display errors without fake success', async ({ page }) => {
  await open(page, 1440);
  await page.getByRole('button', { name: 'Preview import', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('needs its Poshmark URL');
  await page
    .getByLabel(/SH-002: Floral Summer Dress/)
    .fill('https://poshmark.com/listing/Dress-6acf9e893559d52c099ce644');
  await page.getByRole('button', { name: 'Preview import', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('2 listings ready');
  await page.evaluate(() => {
    (window as unknown as { failImport: boolean }).failImport = true;
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm import (1 changes)' }).click();
  await expect(page.getByRole('status')).toContainText('Created 0, updated 0, skipped 1, failed 1');
  await expect(page.getByRole('alert')).toContainText('Permission denied');
});
