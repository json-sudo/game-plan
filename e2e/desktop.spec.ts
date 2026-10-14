import { expect, test, type Page } from '@playwright/test';
import { FM26_DATA } from '../src/data/fm26';
import type { Point } from '../src/data/types';
import type { ZoneId } from '../src/data/zones';
import { ballAtopPosition } from '../src/engine';
import { applyAction, type Action } from '../src/state/actions';
import { activeRoleOf } from '../src/state/context';
import type { PitchDocument, Player } from '../src/state/document';
import { createExampleDocument } from '../src/state/example';
import { selectPhasePositions } from '../src/state/selectors';
import { TOKEN_TEAM_LABELS } from '../src/ui/copy';

test.use({ viewport: { width: 1440, height: 900 } });

const ZONE_NAME = {
  'L-D': 'Left flank - defensive third',
  'R-F': 'Right flank - final third',
} as const;

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

function after(actions: readonly Action[]): PitchDocument {
  return actions.reduce((doc, action) => applyAction(doc, action), createExampleDocument());
}

function tokenName(doc: PitchDocument, player: Player): string {
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  const role = FM26_DATA.roles.find((item) => item.id === roleId)?.name;
  return [player.slot, role, TOKEN_TEAM_LABELS[player.team]].filter(Boolean).join(', ');
}

function shapeOf(doc: PitchDocument, playerId: string): Point {
  const point = selectPhasePositions(doc).shape.get(playerId);
  if (!point) throw new Error(`no shape position for ${playerId}`);
  return point;
}

function pieceThatShifts(zone: ZoneId): { name: string; shifted: Point; restored: Point } {
  const shifted = after([{ type: 'tapZone', zone }]);
  const restored = after([{ type: 'tapZone', zone }, { type: 'reset' }]);
  const player = shifted.players.find((item) => {
    if (!item.slot) return false;
    const from = selectPhasePositions(shifted).shape.get(item.id);
    const to = selectPhasePositions(restored).shape.get(item.id);
    return from !== undefined && to !== undefined && (from.x !== to.x || from.y !== to.y);
  });
  if (!player) throw new Error(`reset does not move a piece after ${zone}`);
  return {
    name: tokenName(shifted, player),
    shifted: shapeOf(shifted, player.id),
    restored: shapeOf(restored, player.id),
  };
}

function ballAt(zone: ZoneId): Point {
  const doc = after([
    { type: 'tapZone', zone: 'L-D' },
    { type: 'tapZone', zone },
  ]);
  const carrierId = doc.scenario?.carrierId;
  const carrier = doc.players.find((player) => player.id === carrierId);
  const point = carrierId ? selectPhasePositions(doc).shape.get(carrierId) : undefined;
  if (!carrier || !point || carrier.team !== doc.attacker) return doc.ball;
  return ballAtopPosition(point);
}

function phasePoint(doc: PitchDocument, phase: 'shape' | 'final'): { name: string; at: Point } {
  const positions = selectPhasePositions(doc);
  const player = doc.players.find((item) => {
    const from = positions.shape.get(item.id);
    const to = positions.final.get(item.id);
    return item.slot && from && to && (from.x !== to.x || from.y !== to.y);
  });
  if (!player?.slot) throw new Error('no piece moves between Shape and Final');
  const at = positions[phase].get(player.id);
  if (!at) throw new Error(`no ${phase} position for ${player.id}`);
  return { name: tokenName(doc, player), at };
}

async function readTranslate(page: Page, role: 'button' | 'img', name: string): Promise<Point> {
  const style = await page.getByRole(role, { name, exact: true }).getAttribute('style');
  const match = style?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) throw new Error(`no translate on ${name}: ${style}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

function expectPoint(actual: Point, expected: Point) {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
}

test('first load at 1440 x 900 shows the example and the hint, with no console errors', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  await expect(page).toHaveTitle('Game Plan');
  await expect(page.getByRole('radio', { name: 'FM mode' })).toBeChecked();
  await expect(page.getByRole('img', { name: 'Pitch' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ball zone' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.getByText('4-3-3 DM Wide')).toBeVisible();
  await expect(page.getByText('4-2-3-1 DM Wide')).toBeVisible();
  await expect(page.getByText(ZONE_NAME['R-F'], { exact: true })).toBeVisible();
  const hint = page.getByRole('complementary', { name: 'How to use the example' });
  await expect(hint).toBeVisible();
  await expect(hint.getByText('Tap a zone on the map.')).toBeVisible();
  await expect(hint.getByText('Press Play.')).toBeVisible();
  await expect(
    hint.getByText('Step through with Next, or tap a player to change its role.'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('zone pick, Play through the phases, and Next disabled at Final', async ({ page }) => {
  const played = after([
    { type: 'tapZone', zone: 'L-D' },
    { type: 'tapZone', zone: 'R-F' },
  ]);
  const moving = phasePoint(played, 'shape');
  await page.goto('/');
  await page.getByRole('button', { name: ZONE_NAME['L-D'] }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();

  await page.getByRole('button', { name: ZONE_NAME['R-F'] }).click();
  await expect(page.getByText(ZONE_NAME['R-F'], { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: ZONE_NAME['R-F'] })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expectPoint(await readTranslate(page, 'img', 'Ball'), ballAt('R-F'));

  expectPoint(await readTranslate(page, 'button', moving.name), moving.at);
  await expect(page.getByRole('button', { name: 'Shape' })).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Runs' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Final' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true');
  expectPoint(await readTranslate(page, 'button', moving.name), phasePoint(played, 'final').at);
});

test('Reset, Undo, Open pitch, and reload return to the FM example', async ({ page }) => {
  const shift = pieceThatShifts('L-D');
  await page.goto('/');
  await page.getByRole('button', { name: ZONE_NAME['L-D'] }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();
  expectPoint(await readTranslate(page, 'button', shift.name), shift.shifted);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText('No zone yet')).toBeVisible();
  expectPoint(await readTranslate(page, 'button', shift.name), shift.restored);
  await expect(page.getByText('4-3-3 DM Wide')).toBeVisible();
  await expect(page.getByText('4-2-3-1 DM Wide')).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();
  expectPoint(await readTranslate(page, 'button', shift.name), shift.shifted);

  await page.getByRole('radio', { name: 'Open pitch' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Bench' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ball zone' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'FM mode' })).toBeChecked();
  await expect(page.getByRole('complementary', { name: 'How to use the example' })).toBeVisible();
  await expect(page.getByText('4-3-3 DM Wide')).toBeVisible();
  await expect(page.getByText(ZONE_NAME['R-F'], { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bench' })).toHaveCount(0);
});
