import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {ThemeProvider,studioTheme} from '@sanity/ui';import {MasterInventoryImport} from './sanity/imports/MasterInventoryImport';createRoot(document.getElementById('fixture')).render(<ThemeProvider theme={studioTheme}><MasterInventoryImport onImported={()=>window.refreshed=true}/></ThemeProvider>);`,
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
    const docs=[{_id:'owned',_rev:'r1',_type:'product',sku:'SH-001',title:'Old boots',shoppingSection:'closet',saleStatus:'sold',availability:'sold',size:'9M',description:'Original description',closetPlatform:'poshmark',poshmarkUrl:'https://poshmark.com/listing/Boots-123',vintedUrl:'https://vinted.com/items/123',photos:[{asset:{_ref:'owned-photo'},alt:'Owned photo'}],relatedReview:{_ref:'review1'}}];window.testDocs=docs;window.testAssets=[];window.uploaded=[];
    const client={withConfig:()=>client,fetch:async(q,p)=>structuredClone(q.includes("_type=='sanity.imageAsset'")?window.testAssets.filter(a=>a._id>p.cursor&&(p.filenames.includes(a.originalFilename)||p.assetIds.includes(a._id))).sort((a,b)=>a._id.localeCompare(b._id)).slice(0,500):p.cursor!==undefined?docs.filter(d=>d._type===(q.includes("_type=='brand'")?'brand':q.includes("_type=='clothingCategory'")?'clothingCategory':'product')&&d._id>p.cursor).sort((a,b)=>a._id.localeCompare(b._id)):docs.filter(d=>d._type==='product'&&((d.sku||'').toLowerCase()===p.sku||String(d.masterInventorySku||'').toLowerCase()===p.sku||p.ids.includes(d._id)))),getDocuments:async(ids)=>structuredClone(ids.map(id=>docs.find(d=>d._id===id)||null)),create:async(doc)=>{if(window.failImport)throw Error('Permission denied');if(docs.some(d=>d._id===doc._id))throw Error('Duplicate');docs.push({...doc,_rev:'new'});},createIfNotExists:async(doc)=>{if(window.failImport)throw Error('Permission denied');if(!docs.some(d=>d._id===doc._id))docs.push({...doc,_rev:'new'});return doc;},patch:(id)=>{let fields;const patch={ifRevisionId:()=>patch,set:(value)=>{fields=value;return patch;},commit:async()=>{if(window.failImport)throw Error('Permission denied');Object.assign(docs.find(d=>d._id===id),fields,{_rev:'new'});}};return patch;},transaction:()=>{let created;const tx={patch:(id,cb)=>{const patch={ifRevisionId:()=>patch,set:()=>patch};cb(patch);return tx;},create:(doc)=>{created=doc;return tx;},commit:async()=>{await client.create(created);}};return tx;},assets:{upload:async(type,file)=>{window.uploaded.push(file.name);const asset={_id:'image-'+(file.name.startsWith('front')?'a':'b').repeat(40)+'-1080x1350-jpg',originalFilename:file.name};if(!window.testAssets.some(a=>a._id===asset._id))window.testAssets.push(asset);return asset;}}};export const useClient=()=>client;`,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
const headers = 'SKU,STATUS,NAME,DESCRIPTION,BRAND,SIZE,IMAGES,POSHMARK,VINTED\n';
const csv =
  headers +
  'SH-001,Available,Master boots,,,,,$54,$49\nSH-002,Sold,Master sandals,Owned description,Example Brand,8.5,front.jpg | back.jpg,$40,$35\n';
async function open(page: import('@playwright/test').Page, width: number, text = csv) {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('**/master-import-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><head><title>Master import test</title></head><body><main id="fixture"></main></body></html>',
    }),
  );
  await page.goto('/master-import-fixture');
  await page.addStyleTag({
    content: readFileSync('node_modules/@sanity/ui/dist/styles.css', 'utf8'),
  });
  await page.addScriptTag({ content: fixture });
  await page.getByRole('button', { name: 'Import master inventory CSV' }).click();
  await page.getByLabel('Master inventory CSV', { exact: true }).setInputFiles({
    name: 'CGR Inventory - SHOES.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(text),
  });
}
for (const width of [1440, 390])
  test(`master CSV previews two stores, uploads ordered photos and saves drafts at ${width}px`, async ({
    page,
  }) => {
    await open(page, width);
    await expect(page.getByRole('status')).toContainText('2 master inventory rows');
    await page.getByRole('button', { name: 'Preview master import' }).click();
    await expect(page.getByRole('alert')).toContainText('select front.jpg');
    await page.getByLabel('Photo files (optional)', { exact: true }).setInputFiles(
      ['front.jpg', 'back.jpg'].map((name) => ({
        name,
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fixture'),
      })),
    );
    await expect(
      page.getByRole('region', { name: 'Selected photo filenames' }).getByRole('listitem'),
    ).toHaveText(['front.jpg', 'back.jpg']);
    await page.getByRole('button', { name: 'Preview master import' }).click();
    await expect(page.getByRole('status')).toContainText('2 items ready');
    await page.getByRole('button', { name: 'Clear selected photos' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Selected photo filenames' })).toHaveCount(0);
    await expect(page.getByLabel('Decision for SH-001')).toHaveCount(0);
    const photoPicker = page.getByLabel('Photo files (optional)', { exact: true });
    await expect(photoPicker).toBeFocused();
    expect(await photoPicker.evaluate((input: HTMLInputElement) => input.files?.length)).toBe(0);
    await expect(page.getByRole('status')).toContainText('Selected photos cleared');
    await photoPicker.setInputFiles(
      ['front.jpg', 'back.jpg'].map((name) => ({
        name,
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fixture'),
      })),
    );
    await page.getByRole('button', { name: 'Preview master import' }).click();
    await expect(page.getByRole('status')).toContainText('2 items ready');

    await expect(page.getByLabel('Decision for SH-001')).toHaveValue('update');
    await expect(page.getByLabel('Decision for SH-002')).toHaveValue('create');
    await expect(page.getByRole('columnheader')).toHaveText([
      'SKU / Item',
      'Status',
      'Category / Brand / Condition / Size',
      'Photos',
      'Poshmark',
      'Vinted',
      'URL',
      'Decision',
      'Notes',
    ]);
    expect(
      await page.evaluate(() => (window as unknown as { uploaded: string[] }).uploaded),
    ).toEqual([]);
    expect(
      (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations,
    ).toEqual([]);
    await page.screenshot({ path: `/tmp/master-inventory-${width}.png` });
    await page.getByRole('checkbox').focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'Confirm master import (2 changes)' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText(
      'Created 1, updated 1, skipped 0, failed 0',
    );
    const result = await page.evaluate(() => ({
      docs: (window as unknown as { testDocs: Record<string, unknown>[] }).testDocs,
      uploaded: (window as unknown as { uploaded: string[] }).uploaded,
    }));
    expect(result.docs.filter((d) => d._type === 'product')).toHaveLength(3);
    expect(result.docs.find((d) => d._id === 'owned')).toMatchObject({
      title: 'Old boots',
      saleStatus: 'sold',
    });
    expect(result.docs.find((d) => d._id === 'drafts.owned')).toMatchObject({
      title: 'Master boots',
      saleStatus: 'available',
      size: '9M',
      description: 'Original description',
      poshmarkPrice: { amount: 54, currency: 'USD' },
      vintedPrice: { amount: 49, currency: 'USD' },
      relatedReview: { _ref: 'review1' },
      poshmarkUrl: 'https://poshmark.com/listing/Boots-123',
    });
    expect(result.uploaded).toEqual(['front.jpg', 'back.jpg']);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Import master inventory CSV' })).toBeFocused();
  });
test('master duplicate SKUs and denied writes report errors without success', async ({ page }) => {
  await open(page, 1440, headers + 'SH-001,Available,Boots,,,,,,\nsh-001,Sold,Boots,,,,,,\n');
  await expect(page.getByRole('alert')).toContainText('appears more than once');
  await expect(page.getByRole('button', { name: 'Preview master import' })).toBeDisabled();
  await page.getByLabel('Master inventory CSV', { exact: true }).setInputFiles({
    name: 'inventory.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(headers + 'SH-001,Available,Boots,,,,,$54,\n'),
  });
  await page.getByRole('button', { name: 'Preview master import' }).click();
  await expect(page.getByRole('status')).toContainText('1 item ready');
  await page.evaluate(() => {
    (window as unknown as { failImport: boolean }).failImport = true;
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm master import (1 changes)' }).click();
  await expect(page.getByRole('status')).toContainText('Created 0, updated 0, skipped 0, failed 1');
  await expect(page.getByRole('alert')).toContainText('Permission denied');
});

test('master URL previews the listing and saves it to the matching Studio purchase fields', async ({
  page,
}) => {
  const url = 'https://www.vinted.com/items/123-boots';
  const csv =
    headers.trimEnd() +
    ',URL\n' +
    ['SH-001', 'Available', 'Master boots', '', '', '', '', '$54', '$49', url].join(',') +
    '\n';
  await open(page, 1440, csv);
  await page.getByRole('button', { name: 'Preview master import' }).click();
  await expect(page.getByRole('status')).toContainText('1 item ready');
  await expect(
    page.getByRole('link', { name: 'Open listing for SH-001 (opens in a new tab)' }),
  ).toHaveAttribute('href', url);
  await expect(page.getByText('Primary marketplace: Vinted')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm master import (1 changes)' }).click();
  await expect(page.getByRole('status')).toContainText('updated 1');
  const docs = await page.evaluate(
    () => (window as unknown as { testDocs: Record<string, unknown>[] }).testDocs,
  );
  expect(docs.find((doc) => doc._id === 'drafts.owned')).toMatchObject({
    purchaseUrl: url,
    vintedUrl: url,
    closetPlatform: 'vinted',
    listingPrice: 49,
    poshmarkUrl: 'https://poshmark.com/listing/Boots-123',
  });
});

test('master CSV reuses prior uploads and requests only missing image files', async ({ page }) => {
  await open(page, 390);
  await page.evaluate(() => {
    (window as unknown as { testAssets: unknown[] }).testAssets = [
      { _id: 'image-' + 'a'.repeat(40) + '-1080x1350-jpg', originalFilename: 'front.jpg' },
    ];
  });
  await page.getByRole('button', { name: 'Preview master import' }).click();
  await expect(page.getByRole('alert')).toContainText('select back.jpg');
  await expect(page.getByRole('alert')).not.toContainText('select front.jpg');
  await expect(
    page.getByText('1 existing image asset will be reused.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirm master import (2 changes)' }),
  ).toBeDisabled();
  await page
    .getByLabel('Photo files (optional)', { exact: true })
    .setInputFiles({ name: 'back.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('new photo') });
  await page.getByRole('button', { name: 'Preview master import' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm master import (2 changes)' }).click();
  await expect(page.getByRole('status')).toContainText('Created 1, updated 1');
  expect(await page.evaluate(() => (window as unknown as { uploaded: string[] }).uploaded)).toEqual(
    ['back.jpg'],
  );
  await page.getByRole('button', { name: 'Clear selected photos' }).click();
  await page.getByRole('button', { name: 'Preview master import' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByText('2 existing image assets will be reused.', { exact: false }),
  ).toBeVisible();
});

test('master category and condition preview connects new labels to draft inventory', async ({
  page,
}) => {
  await open(
    page,
    1440,
    'SKU,STATUS,NAME,DESCRIPTION,BRAND,SIZE,IMAGES,POSHMARK,VINTED,Category,Condition\nSH-003,Available,New boots,,Fresh Brand,9,,54,,Shoes,Like new\n',
  );
  await page.getByRole('button', { name: 'Preview master import' }).click();
  await expect(page.getByText('New category label', { exact: true })).toBeVisible();
  await expect(page.getByText('Like new', { exact: true })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm master import' }).click();
  await expect(page.getByRole('status')).toContainText('Created 1');
  const docs = await page.evaluate(
    () => (window as unknown as { testDocs: Record<string, unknown>[] }).testDocs,
  );
  const category = docs.find((doc) => doc._type === 'clothingCategory')!;
  const product = docs.find((doc) => doc.sku === 'SH-003')!;
  expect(category.title).toBe('Shoes');
  expect(product.condition).toBe('Like new');
  expect(product.categories).toEqual([
    { _key: category._id, _type: 'reference', _ref: category._id },
  ]);
  expect(product._id).toMatch(/^drafts\./);
});
