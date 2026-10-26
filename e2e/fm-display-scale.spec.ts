import { expect, test, type Page } from '@playwright/test';

const WIDTHS = [320, 390, 768, 1440];
const PLAYER_UNITS = 4.4;
const PITCH_UNITS_W = 76.19;
const SIZE_TOLERANCE_PX = 0.6;
const DESKTOP_CAP_PX = 34;
const PHONE_MAX_WIDTH = 600;

async function startFm(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const phone = (page.viewportSize()?.width ?? 0) <= PHONE_MAX_WIDTH;
  if (phone) await page.getByRole('button', { name: 'Start setup' }).click();
  const setup = phone ? page.getByRole('dialog', { name: 'Guided setup' }) : page;
  await setup
    .getByRole('radiogroup', { name: 'My team' })
    .getByRole('radio', { name: '4-3-3 DM Wide' })
    .click();
  await setup.getByRole('button', { name: 'Next' }).click();
  await setup.getByRole('button', { name: /^(Done|Save)$/ }).click();
  await page.getByRole('button', { name: 'Right flank - final third' }).click();
  await expect(page.getByText(/^Starts with /)).toBeVisible();
}

for (const width of WIDTHS) {
  test(`FM glyphs scale with the pitch and nothing overflows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await startFm(page);
    const result = await page.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]')!.getBoundingClientRect();
      const body = document.querySelector('g[data-team="mine"] [data-part="body"]')!;
      const bodyRect = body.getBoundingClientRect();
      const tokens = [...document.querySelectorAll('g[data-team]')].map((token) =>
        token.getBoundingClientRect(),
      );
      return {
        pitchW: svg.width,
        left: svg.left,
        right: svg.right,
        bodyPx: bodyRect.width,
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        clipped: tokens.filter((rect) => rect.left < svg.left - 0.5 || rect.right > svg.right + 0.5)
          .length,
      };
    });
    expect(result.scrollW).toBeLessThanOrEqual(result.clientW);
    expect(result.clipped).toBe(0);
    const expected = Math.min((PLAYER_UNITS * result.pitchW) / PITCH_UNITS_W, DESKTOP_CAP_PX);
    expect(Math.abs(result.bodyPx - expected)).toBeLessThan(SIZE_TOLERANCE_PX);
  });
}

test('phone keeps roles out of on-pitch labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startFm(page);
  await expect(page.locator('g[data-team="mine"] [data-part="role"]')).toHaveCount(0);
  await expect(page.locator('g[data-team="mine"]').first()).toHaveAttribute('data-fixed', 'true');
});
