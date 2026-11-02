import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Request a Review opens from Support and restores focus after button and Escape closure', async ({ page }) => {
  await page.goto('/support');
  const trigger = page.getByRole('button', { name: 'Request a Review', exact: true }).first();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Request a review', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Email address')).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('.request-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);
  await dialog.getByRole('button', { name: 'Close request dialog' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
