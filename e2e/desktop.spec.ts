import { expect, test, type Page } from '@playwright/test';
import type { Point } from '../src/data/types';
import { encodeShareHash } from '../src/share';
import { applyTacticAction } from '../src/state/tactic-actions';
import { createExampleTactic } from '../src/state/tactic';

test.use({ viewport: { width: 1440, height: 900 } });

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function readTranslate(page: Page, role: 'button' | 'img', name: string): Promise<Point> {
  const style = await page.getByRole(role, { name, exact: true }).getAttribute('style');
  const match = style?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) throw new Error(`no translate on ${name}: ${style}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

test('first load at 1440 x 900 opens FM mode with no console errors', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  await expect(page).toHaveTitle('Game Plan');
  await expect(page.getByRole('radio', { name: 'FM mode', exact: true })).toBeChecked();
  await expect(page.getByRole('img', { name: 'Pitch' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('an Open pitch share link opens in Open pitch with its layout, and FM mode is still reachable', async ({
  page,
}) => {
  const tactic = applyTacticAction(createExampleTactic(), 'openPitch', {
    type: 'applyFormation',
    team: 'mine',
    formationId: '4_3_3_dm_wide',
  });
  const encoded = encodeShareHash({ tactic, mode: 'openPitch' });
  if (encoded.status !== 'ok') throw new Error('expected the tactic to fit in a link');
  await page.goto(`/${encoded.hash}`);
  await expect(page.getByRole('radio', { name: 'Open pitch', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'ST, my team', exact: true })).toBeVisible();

  await page.getByRole('radio', { name: 'FM mode', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'FM mode', exact: true })).toBeChecked();
});

test('players move between the bench and the pitch in Open pitch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Open pitch', exact: true }).click();
  const squad = page.getByRole('radiogroup', { name: 'My team squad size' });
  await squad.getByRole('radio', { name: '20' }).click();
  const chip = page.getByRole('button', { name: 'GK, my team', exact: true });
  await expect(chip).toBeVisible();
  const pitch = await page.getByRole('img', { name: 'Pitch', exact: true }).boundingBox();
  const from = await chip.boundingBox();
  if (!pitch || !from) throw new Error('pitch or bench not laid out');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(pitch.x + pitch.width / 2, pitch.y + pitch.height * 0.6, { steps: 8 });
  await page.mouse.up();
  const placed = page.getByRole('button', { name: 'GK, my team', exact: true });
  await expect(placed).toBeVisible();
  await expect(page.getByText('1 on pitch · 30 on bench')).toBeVisible();

  const token = await placed.boundingBox();
  const bench = await page.getByRole('heading', { name: 'Bench' }).boundingBox();
  if (!token || !bench) throw new Error('token or bench not laid out');
  await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
  await page.mouse.down();
  await page.mouse.move(bench.x + 40, bench.y + 40, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('0 on pitch · 31 on bench')).toBeVisible();
});

test('a bench player can be placed with a click and moved with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Open pitch', exact: true }).click();
  await page
    .getByRole('radiogroup', { name: 'My team squad size' })
    .getByRole('radio', { name: '20' })
    .click();
  await page.getByRole('button', { name: 'GK, my team', exact: true }).first().click();
  await expect(page.getByText('1 on pitch · 30 on bench')).toBeVisible();
  const token = page
    .getByRole('img', { name: 'Pitch', exact: true })
    .getByRole('button', { name: 'GK, my team', exact: true });
  const before = await readTranslate(page, 'button', 'GK, my team');
  await token.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await readTranslate(page, 'button', 'GK, my team')).x)
    .toBeGreaterThan(before.x);
  await page.keyboard.press('Delete');
  await expect(page.getByText('0 on pitch · 31 on bench')).toBeVisible();
});

test('the ball can be dragged to a new spot in open pitch', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('radio', { name: 'Open pitch', exact: true }).click();

  const before = await readTranslate(page, 'button', 'Ball');
  const ball = await page.getByRole('button', { name: 'Ball', exact: true }).boundingBox();
  const pitch = await page.getByRole('img', { name: 'Pitch', exact: true }).boundingBox();
  if (!ball || !pitch) throw new Error('ball or pitch not laid out');
  const start = { x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y + 60, { steps: 8 });
  await page.mouse.up();

  await expect
    .poll(async () => {
      const at = await readTranslate(page, 'button', 'Ball');
      return Math.hypot(at.x - before.x, at.y - before.y);
    })
    .toBeGreaterThan(5);
});

test('the first zone pick walks tokens on from the goal lines', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByText('Finish setting up your preferences to see your tactic visualization'),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /my team$/ })).toHaveCount(0);

  await page
    .getByRole('radiogroup', { name: 'My team' })
    .getByRole('radio', { name: '4-3-3 DM Wide' })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('img', { name: /my team$/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^(Done|Save)$/ }).click();
  await expect(
    page.getByText('Pick a zone to finish setting up your tactic visualization'),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /my team$/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Right flank - final third' }).click();
  const keeper = 'GK, No-Nonsense Goalkeeper, my team';
  await expect(page.getByRole('img', { name: keeper, exact: true })).toBeVisible();
  const sampled: number[] = [];
  for (let sample = 0; sample < 40; sample += 1) {
    sampled.push((await readTranslate(page, 'img', keeper)).y);
    await page.waitForTimeout(30);
  }
  const first = sampled[0];
  const last = sampled[sampled.length - 1];
  expect(first).toBeGreaterThan(90);
  expect(last).toBeLessThan(first - 5);
  expect(sampled.some((y) => Math.abs(y - first) > 0.01 && Math.abs(y - last) > 0.01)).toBe(true);
});
