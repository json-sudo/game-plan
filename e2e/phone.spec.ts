import { expect, test, type Page } from '@playwright/test';
import { FM26_DATA } from '../src/data/fm26';
import type { Point } from '../src/data/types';
import { activeRoleOf } from '../src/state/context';
import { pieceLabel } from '../src/state/bench-pieces';
import { playerSide, type PitchDocument, type Player } from '../src/state/document';
import { createExampleDocument } from '../src/state/example';
import { selectPhasePositions } from '../src/state/selectors';
import { PITCH_LABEL, TOKEN_TEAM_LABELS, tokenSideLabel } from '../src/ui/copy';

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

function sideLabel(player: Player): string | undefined {
  const side = playerSide(player);
  return side ? tokenSideLabel(side) : undefined;
}

function tokenName(doc: PitchDocument, player: Player): string {
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  const role = FM26_DATA.roles.find((item) => item.id === roleId)?.name;
  return [
    pieceLabel(doc, player, FM26_DATA),
    sideLabel(player),
    role,
    TOKEN_TEAM_LABELS[player.team],
  ]
    .filter(Boolean)
    .join(', ');
}

function movingPlayer(doc: PitchDocument): { name: string; shape: Point; final: Point } {
  const positions = selectPhasePositions(doc);
  const player = doc.players.find((item) => {
    const from = positions.shape.get(item.id);
    const to = positions.final.get(item.id);
    return item.slot && from && to && (from.x !== to.x || from.y !== to.y);
  });
  if (!player) throw new Error('no piece moves between Shape and Final');
  const shape = positions.shape.get(player.id);
  const final = positions.final.get(player.id);
  if (!shape || !final) throw new Error(`no phase positions for ${player.id}`);
  return { name: tokenName(doc, player), shape, final };
}

async function readTranslate(page: Page, name: string): Promise<Point> {
  const style = await page.getByRole('button', { name, exact: true }).getAttribute('style');
  const match = style?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) throw new Error(`no translate on ${name}: ${style}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

function expectPoint(actual: Point, expected: Point) {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
}

test('first load at 390 x 844 shows the FM example and the phone hint, with no console errors', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(page.viewportSize()).toEqual({ width: 390, height: 844 });
  await expect(page.getByRole('img', { name: PITCH_LABEL })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ball zone' })).toBeVisible();
  const hint = page.getByRole('complementary', { name: 'How to use the example' });
  await expect(hint).toBeVisible();
  await expect(hint.getByText('4-3-3 DM Wide vs 4-2-3-1 DM Wide', { exact: true })).toBeVisible();
  await expect(
    hint.getByText('Step through with Next, or tap a player to see its role.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('Play moves the pitch through Shape, Runs and Final, and Next is disabled at Final', async ({
  page,
}) => {
  const doc = createExampleDocument();
  const moving = movingPlayer(doc);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Shape', exact: true })).toHaveAttribute(
    'aria-current',
    'step',
  );
  expectPoint(await readTranslate(page, moving.name), moving.shape);

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Runs', exact: true })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.getByRole('button', { name: 'Final', exact: true })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expectPoint(await readTranslate(page, moving.name), moving.final);
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
