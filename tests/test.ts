import { expect, test } from '@playwright/test';

test('Navigate to About Page', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'AnimoRank' }).first()).toBeVisible();
});
