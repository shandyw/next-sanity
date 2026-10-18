import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

let fixture: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ThemeProvider,studioTheme} from '@sanity/ui'; import {InventoryTool} from './sanity/inventory/InventoryTool'; createRoot(document.getElementById('fixture')).render(<ThemeProvider theme={studioTheme}><InventoryTool /></ThemeProvider>);`,
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
        name: 'authenticated-studio-fixture',
        setup(builder) {
          builder.onResolve({ filter: /^sanity(\/router)?$/ }, (args) => ({
            path: args.path,
            namespace: 'studio-fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'studio-fixture' }, (args) => ({
            loader: 'tsx',
            resolveDir: process.cwd(),
            contents:
              args.path === 'sanity/router'
                ? `import React from 'react'; export const IntentLink=({params,children,...props})=><a {...props} href={'/studio/structure/product;'+params.id}>{children}</a>;`
                : `
        const docs = Array.from({length:28}, (_,i)=>({_id:'item'+String(i).padStart(2,'0'),_rev:'rev',_type:'product',sku:'CGR-'+String(i).padStart(3,'0'),title:'Item '+i,description:'Linen blouse '+i,brandName:i===0?'Acme':'Other',size:'16',listingPrice:20,currency:'USD',availability:i<26?'available':'sold'}));
        docs.push({...docs[0],_id:'drafts.item00'});
        docs.push({_id:'curated',_rev:'rev',_type:'product',shoppingSection:'finds'});
        const client={withConfig:()=>client,fetch:async(query,params)=>{await new Promise(r=>setTimeout(r,100));if(window.inventoryError)throw Error('offline');return params.ids?docs.filter(p=>params.ids.includes(p._id)):docs.filter(p=>p._id>params.cursor).sort((a,b)=>a._id.localeCompare(b._id)).slice(0,500);},create:async(doc)=>{docs.push(doc);},patch:(id)=>{const patch={ifRevisionId:()=>patch,set:(fields)=>{patch.fields=fields;return patch;},commit:async()=>{await new Promise(r=>setTimeout(r,250));Object.assign(docs.find(p=>p._id===id),patch.fields);}};return patch;}};
        client.transaction=()=>{const deleted=[],guards=[];const tx={patch:(id,callback)=>{const patch={ifRevisionId:(rev)=>{guards.push({id,rev});return patch;},set:()=>patch};callback(patch);return tx;},delete:(id)=>{deleted.push(id);return tx;},commit:async()=>{await new Promise(r=>setTimeout(r,250));if(window.inventoryDeleteError)throw Error('referenced document');for(const guard of guards){if(docs.find(p=>p._id===guard.id)?._rev!==guard.rev)throw Error('changed');}for(let i=docs.length-1;i>=0;i--){if(deleted.includes(docs[i]._id))docs.splice(i,1);}}};return tx;};
        client.action=async(action)=>{await new Promise(r=>setTimeout(r,200));if(window.inventoryPublicationError)throw Error('denied or referenced');const draft=docs.find(d=>d._id===action.draftId),published=docs.find(d=>d._id===action.publishedId);if(action.actionType.endsWith('.unpublish')){if(!draft)docs.push({...published,_id:action.draftId,_rev:'unpublished'});docs.splice(docs.indexOf(published),1);}else{if(action.ifDraftRevisionId!==draft?._rev)throw Error('changed');if(published)docs.splice(docs.indexOf(published),1);docs.push({...draft,_id:action.publishedId,_rev:'published'});docs.splice(docs.indexOf(draft),1);}};
        export const useWorkspace=()=>({}); export const useCurrentUser=()=>null;
        export const validateDocument=async()=>window.inventoryInvalid?[{level:'error',message:'Photos are required'}]:[];
        export const useSource=()=>({auth:{}}); export const useClient=()=>client;
        export const useDocumentPairPermissions=()=>[{granted:!window.inventoryReadOnly},false];
      `,
          }));
        },
      },
    ],
  });
  fixture = result.outputFiles[0].text;
});
async function openFixture(page: import('@playwright/test').Page, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('http://localhost:3000/inventory-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><head><title>Inventory test</title></head><body style="margin:0"><main id="fixture"></main></body></html>',
    }),
  );
  await page.goto('/inventory-fixture');
  await page.addStyleTag({
    content: readFileSync('node_modules/@sanity/ui/dist/styles.css', 'utf8'),
  });
  await page.addScriptTag({ content: fixture });
  await expect(page.getByRole('button', { name: 'All (28)', exact: true })).toBeVisible();
}
for (const width of [1440, 390]) {
  test(`inventory filtering, draft actions, keyboard and layout at ${width}px`, async ({
    page,
  }) => {
    await openFixture(page, width);
    await expect(page.getByRole('columnheader')).toHaveText([
      'SKU',
      'Brand',
      'Item Description',
      'Size',
      'Price',
      'Available/Sold',
      'Actions',
    ]);
    await expect(page.locator('tbody tr')).toHaveCount(25);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await page.getByRole('button', { name: 'Sold (2)', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.locator('tbody tr').first().locator('td').nth(5)).toContainText('Sold');
    const background = await page
      .locator('tbody tr')
      .first()
      .evaluate((row) => getComputedStyle(row).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    await page.getByRole('button', { name: 'All (28)', exact: true }).click();
    const search = page.getByRole('textbox');
    await search.fill('Acme');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await search.fill('CGR-000');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    const action = page.getByRole('button', { name: 'Mark sold: Item 0', exact: true });
    await action.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Mark sold: Item 0', exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('marked sold in its draft');
    await expect(page.getByRole('button', { name: 'Sold (3)', exact: true })).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Edit Item 0/ })).toHaveAttribute(
      'href',
      '/studio/structure/product;item00',
    );
    const availableAction = page.getByRole('button', {
      name: 'Mark available: Item 0',
      exact: true,
    });
    await availableAction.click();
    await expect(page.getByRole('status')).toContainText('marked available in its draft');
    await search.fill('no matching item');
    await expect(page.getByText('No items match your search or filter.')).toBeVisible();
    await page.getByRole('button', { name: 'Reset search and filters' }).click();
    await page.getByRole('combobox').selectOption('sku');
    await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('CGR-000');
    await page.getByRole('button', { name: 'Reverse sort direction' }).click();
    await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('CGR-027');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await page.screenshot({ path: `test-results/inventory-${width}.png`, fullPage: true });
  });
}
test('inventory read errors provide retry feedback', async ({ page }) => {
  await openFixture(page, 1440);
  await page.evaluate(() => {
    (window as Window & { inventoryError?: boolean }).inventoryError = true;
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load inventory');
});

for (const width of [1440, 390]) {
  test(`inventory deletion confirms, cancels and refreshes at ${width}px`, async ({ page }) => {
    await openFixture(page, width);
    const remove = page.getByRole('button', { name: 'Delete item: Item 0', exact: true });
    await remove.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Delete item?', exact: true });
    await expect(dialog).toContainText('draft/published versions');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await expect(page.getByRole('button', { name: 'All (28)', exact: true })).toBeVisible();
    await remove.click();
    await dialog.getByRole('button', { name: 'Delete item', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Deleting…', exact: true })).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('CGR-000 deleted from Sanity');
    await expect(page.getByRole('button', { name: 'All (27)', exact: true })).toBeVisible();
    await expect(remove).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeFocused();
  });
}

test('inventory delete errors preserve the row and denied permissions disable deletion', async ({
  page,
}) => {
  await openFixture(page, 1440);
  await page.evaluate(() => {
    (window as Window & { inventoryDeleteError?: boolean }).inventoryDeleteError = true;
  });
  await page.getByRole('button', { name: 'Delete item: Item 0', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete item?', exact: true });
  await dialog.getByRole('button', { name: 'Delete item', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Item was not deleted');
  await expect(dialog.getByRole('button', { name: 'Delete item', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate(() => {
    (window as Window & { inventoryReadOnly?: boolean }).inventoryReadOnly = true;
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete item: Item 0', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'All (28)', exact: true })).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`inventory publication controls validate, confirm and toggle at ${width}px`, async ({
    page,
  }) => {
    await openFixture(page, width);
    await page.getByRole('textbox').fill('CGR-000');
    await page.getByRole('button', { name: 'Publish: Item 0', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Publish item?', exact: true });
    await expect(dialog).toContainText('including any other draft edits');
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Publish: Item 0', exact: true })).toBeFocused();
    await page.evaluate(() => {
      (window as Window & { inventoryInvalid?: boolean }).inventoryInvalid = true;
    });
    await page.getByRole('button', { name: 'Publish: Item 0', exact: true }).click();
    await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Photos are required');
    await page.evaluate(() => {
      (window as Window & { inventoryInvalid?: boolean }).inventoryInvalid = false;
    });
    await dialog.getByRole('button', { name: 'Publish', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Set to Draft: Item 0', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('status')).toContainText('CGR-000 published');
    await page.getByRole('button', { name: 'Set to Draft: Item 0', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Set item to Draft?', exact: true });
    await expect(dialog).toContainText('keep its content as an editable draft');
    await dialog.getByRole('button', { name: 'Set to Draft', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Publish: Item 0', exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('set to Draft and unpublished');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test('publication failures retain the item and denied permissions disable controls', async ({
  page,
}) => {
  await openFixture(page, 1440);
  await page.getByRole('textbox').fill('CGR-001');
  await page.evaluate(() => {
    (window as Window & { inventoryPublicationError?: boolean }).inventoryPublicationError = true;
  });
  await page.getByRole('button', { name: 'Set to Draft: Item 1', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Set to Draft', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Publication was not changed');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate(() => {
    (window as Window & { inventoryReadOnly?: boolean }).inventoryReadOnly = true;
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Set to Draft: Item 1', exact: true }),
  ).toBeDisabled();
});

test('Studio selects retain a single arrow with the public stylesheet loaded', async ({ page }) => {
  await openFixture(page, 1440);
  await page.addStyleTag({
    content: readFileSync('app/globals.css', 'utf8').replace(/^@import.*$/gm, ''),
  });
  const select = page.getByRole('combobox').first();
  await expect(select).toHaveCSS('background-image', 'none');
  await expect(select).toHaveCSS('appearance', 'none');
  await select.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toBeFocused();
});
