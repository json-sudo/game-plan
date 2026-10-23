import { expect, test, type Page } from '@playwright/test';
import { PITCH_LABEL } from '../src/ui/copy';

test.use({ viewport: { width: 390, height: 844 } });

const BENCH_HEADING = 'Bench';

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('first load at 390 x 844 opens guided setup at step 1 with no console errors', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(page.viewportSize()).toEqual({ width: 390, height: 844 });
  const setup = page.getByRole('region', { name: 'Guided setup' });
  await expect(setup).toBeVisible();
  await expect(setup.getByText('Step 1 of 2')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the bench button opens the bench sheet in Open pitch, and Escape closes it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Mode: FM mode', exact: true }).click();

  const benchButton = page.getByRole('button', { name: /^Bench \(\d+\)$/ });
  await benchButton.click();
  const sheet = page.getByRole('dialog', { name: BENCH_HEADING });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: BENCH_HEADING })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(benchButton).toBeFocused();
});

test('a bench player tapped in the sheet appears on the pitch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: 'Mode: FM mode', exact: true }).click();

  await page.getByRole('button', { name: /^Bench \(\d+\)$/ }).click();
  const sheet = page.getByRole('dialog', { name: BENCH_HEADING });
  await sheet
    .getByRole('radiogroup', { name: 'My team squad size' })
    .getByRole('radio', { name: '20' })
    .click();
  await sheet.getByRole('button', { name: 's1, my team', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(
    page.getByRole('img', { name: PITCH_LABEL }).getByRole('button', { name: 's1, my team' }),
  ).toBeVisible();
});

test('the page has no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.client).toBe(390);
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('a pitch player touch-dragged onto the bench drop zone goes to the bench', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('menuitem', { name: 'Mode: FM mode', exact: true }).click();
    const benchButton = page.getByRole('button', { name: /^Bench \(\d+\)$/ });
    await benchButton.click();
    await page
      .getByRole('dialog', { name: BENCH_HEADING })
      .getByRole('button', { name: 'GK, my team', exact: true })
      .click();
    const benchedBefore = Number((await benchButton.textContent())?.match(/\d+/)?.[0]);

    const token = page
      .getByRole('img', { name: PITCH_LABEL })
      .getByRole('button', { name: 'GK, my team', exact: true });
    const box = await token.boundingBox();
    if (!box) throw new Error('GK token has no box');
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    const cdp = await page.context().newCDPSession(page);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      point?: { x: number; y: number },
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: point ? [{ x: point.x, y: point.y }] : [],
      });

    await touch('touchStart', start);
    for (let step = 1; step <= 8; step += 1) {
      await touch('touchMove', { x: start.x, y: start.y - step * 10 });
    }
    const dropZone = page.getByText('Drop here to bench', { exact: true });
    await expect(dropZone).toBeVisible();
    const zoneBox = await dropZone.boundingBox();
    if (!zoneBox) throw new Error('drop zone has no box');
    const target = { x: zoneBox.x + zoneBox.width / 2, y: zoneBox.y + zoneBox.height / 2 };
    await touch('touchMove', target);
    await touch('touchEnd');

    await expect(benchButton).toHaveText(`Bench (${benchedBefore + 1})`);
    await expect(token).toHaveCount(0);
  });
});
