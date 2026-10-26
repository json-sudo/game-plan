import { expect, test, type Page } from '@playwright/test';

const MIN_PNG_BYTES = 5000;

async function startFm(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('radiogroup', { name: 'My team' })
    .getByRole('radio', { name: '4-3-3 DM Wide' })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /^(Done|Save)$/ }).click();
  await page.getByRole('button', { name: 'Right flank - final third' }).click();
  await expect(page.getByText(/^Starts with /)).toBeVisible();
}

test('exporting mid-pass produces a non-blank PNG and leaves the display unchanged', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startFm(page);
  const transforms = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<SVGGElement>('g[data-team]')]
        .map((token) => token.style.transform)
        .join('|'),
    );
  const initial = await transforms();
  await expect.poll(async () => (await transforms()) !== initial).toBe(true);
  const startsWith = await page.getByText(/^Starts with /).textContent();
  expect(startsWith).not.toBeNull();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);

  await page.getByRole('button', { name: 'Export PNG' }).click();
  const preview = page.getByRole('img', { name: 'Preview of the exported image' });
  await expect(preview).toBeVisible();
  const bytes = await preview.evaluate(async (image) => {
    const response = await fetch((image as HTMLImageElement).src);
    return (await response.blob()).size;
  });
  expect(bytes).toBeGreaterThan(MIN_PNG_BYTES);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText(/^Starts with /)).toHaveText(startsWith!);
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
});
