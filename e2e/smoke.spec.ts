import { expect, test } from '@playwright/test';

test('placeholder page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Game Plan is being rebuilt' })).toBeVisible();
  await expect(page).toHaveTitle('Game Plan');
});
