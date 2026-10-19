import { expect, test, type Page } from '@playwright/test';
import { FM26_DATA } from '../src/data/fm26';
import type { Point } from '../src/data/types';
import type { ZoneId } from '../src/data/zones';
import { ballAtopPosition } from '../src/engine';
import { applyAction, type Action } from '../src/state/actions';
import { activeRoleOf } from '../src/state/context';
import type { PitchDocument, Player } from '../src/state/document';
import { createExampleDocument } from '../src/state/example';
import { encodeShareHash } from '../src/share';
import { applyTacticAction } from '../src/state/tactic-actions';
import { createExampleTactic } from '../src/state/tactic';
import { selectPhasePositions } from '../src/state/selectors';
import { pieceLabel } from '../src/state/bench-pieces';
import { playerSide } from '../src/state/document';
import { TOKEN_TEAM_LABELS, tokenSideLabel } from '../src/ui/copy';

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

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

function after(actions: readonly Action[]): PitchDocument {
  return actions.reduce((doc, action) => applyAction(doc, action), createExampleDocument());
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

function shapeOf(doc: PitchDocument, playerId: string): Point {
  const point = selectPhasePositions(doc).shape.get(playerId);
  if (!point) throw new Error(`no shape position for ${playerId}`);
  return point;
}

function pieceThatShifts(
  zone: ZoneId,
  carrierId: string,
): { name: string; shifted: Point; restored: Point } {
  const picked: Action[] = [
    { type: 'tapZone', zone },
    { type: 'setCarrier', playerId: carrierId },
  ];
  const shifted = after(picked);
  const restored = after([...picked, { type: 'reset' }]);
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

function ballAt(zone: ZoneId, carrierId: string): Point {
  const doc = after([
    { type: 'tapZone', zone },
    { type: 'setCarrier', playerId: carrierId },
  ]);
  const point = selectPhasePositions(doc).shape.get(carrierId);
  if (!point) throw new Error(`no shape position for ${carrierId}`);
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

async function expectSettledAt(page: Page, role: 'button' | 'img', name: string, expected: Point) {
  await expect
    .poll(async () => {
      const at = await readTranslate(page, role, name);
      return Math.hypot(at.x - expected.x, at.y - expected.y);
    })
    .toBeLessThan(0.05);
}

test('first load at 1440 x 900 shows the example and the hint, with no console errors', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  await expect(page).toHaveTitle('Game Plan');
  await expect(page.getByRole('radio', { name: 'FM mode', exact: true })).toBeChecked();
  await expect(page.getByRole('img', { name: 'Pitch' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ball zone' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
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

test('zone pick, explicit carrier, Play through the phases, and Next disabled at Final', async ({
  page,
}) => {
  const played = after([
    { type: 'tapZone', zone: 'L-D' },
    { type: 'setCarrier', playerId: exampleSlotId('mine', 'DL') },
    { type: 'tapZone', zone: 'R-F' },
    { type: 'setCarrier', playerId: exampleSlotId('mine', 'AMCR') },
  ]);
  const moving = phasePoint(played, 'shape');
  await page.goto('/');
  await page.getByRole('button', { name: ZONE_NAME['L-D'] }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'D(L) - Wing Back' }).click();
  await expect(page.getByRole('radio', { name: 'D(L) - Wing Back' })).toBeChecked();

  await page.getByRole('button', { name: ZONE_NAME['R-F'] }).click();
  await expect(page.getByText(ZONE_NAME['R-F'], { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: ZONE_NAME['R-F'] })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('radio', { name: 'AM(R) - Winger' })).not.toBeChecked();
  await page.getByRole('radio', { name: 'AM(R) - Winger' }).click();
  await expectSettledAt(page, 'img', 'Ball', ballAt('R-F', exampleSlotId('mine', 'AMCR')));

  await expectSettledAt(page, 'button', moving.name, moving.at);
  await expect(page.getByRole('button', { name: 'Shape', exact: true })).toHaveAttribute(
    'aria-current',
    'step',
  );
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
  await expectSettledAt(page, 'button', moving.name, phasePoint(played, 'final').at);
});

test('Reset, Undo and Open pitch keep the FM layout, and a reload opens the empty Open pitch', async ({
  page,
}) => {
  const shift = pieceThatShifts('L-D', exampleSlotId('mine', 'DL'));
  await page.goto('/');
  await page.getByRole('button', { name: ZONE_NAME['L-D'] }).click();
  await page.getByRole('radio', { name: 'D(L) - Wing Back' }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();
  await expectSettledAt(page, 'button', shift.name, shift.shifted);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByText('Centre - middle third', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'D(L) - Wing Back' })).toHaveCount(0);
  await expectSettledAt(page, 'button', shift.name, shift.restored);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();
  await expectSettledAt(page, 'button', shift.name, shift.shifted);

  await page.getByRole('radio', { name: 'Open pitch' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Bench' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ball zone' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Who has the ball?' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Ball' })).toBeVisible();

  await expect(page.getByRole('button', { name: shift.name })).toHaveCount(0);

  await page.getByRole('radio', { name: 'FM mode', exact: true }).click();
  await expect(page.getByText(ZONE_NAME['L-D'], { exact: true })).toBeVisible();
  await expectSettledAt(page, 'button', shift.name, shift.shifted);

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Open pitch', exact: true })).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Bench' })).toBeVisible();
  await expect(page.getByRole('button', { name: shift.name })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'How to use the example' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(mine|opponent)-\d+/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ST, my team' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'ST, opponent' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'AM(C), opponent' })).toHaveCount(1);
});

test('a new-format share link opens in the mode it was made in with both layouts intact', async ({
  page,
}) => {
  const tactic = applyTacticAction(createExampleTactic(), 'openPitch', {
    type: 'applyFormation',
    team: 'mine',
    formationId: '4_3_3_dm_wide',
  });
  const encoded = encodeShareHash({ tactic, mode: 'openPitch' }, 'shape');
  if (encoded.status !== 'ok') throw new Error('expected the tactic to fit in a link');
  await page.goto(`/${encoded.hash}`);
  await expect(page.getByRole('radio', { name: 'Open pitch', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'ST, my team', exact: true })).toBeVisible();

  await page.getByRole('radio', { name: 'FM mode', exact: true }).click();
  await expect(page.getByText(ZONE_NAME['R-F'], { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
});

test('a pass sends the ball to the teammate before the carrier changes', async ({ page }) => {
  const shown = selectPhasePositions(createExampleDocument()).shape;
  const passed = after([
    { type: 'pass', receiverId: exampleSlotId('mine', 'DR'), positions: shown },
  ]);
  const receiver = shown.get(exampleSlotId('mine', 'DR'));
  if (!receiver) throw new Error('no position for the receiver');
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Pass to' }).selectOption(exampleSlotId('mine', 'DR'));
  await page.getByRole('button', { name: 'Pass', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Pass to' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Pass to' })).toBeEnabled();
  await expectSettledAt(page, 'img', 'Ball', ballAtopPosition(receiver));
  const everyone = selectPhasePositions(passed).shape;
  for (const player of passed.players) {
    await expectSettledAt(page, 'button', tokenName(passed, player), everyone.get(player.id)!);
  }
});

test('a dribble moves the carrier and the ball together', async ({ page }) => {
  const dribbled = after([{ type: 'dribble', direction: 'forward' }]);
  const carrier = selectPhasePositions(dribbled).shape.get(exampleSlotId('mine', 'AMCR'));
  if (!carrier) throw new Error('no position for the carrier');
  await page.goto('/');
  await page.getByRole('button', { name: 'Dribble forward' }).click();
  await expectSettledAt(page, 'img', 'Ball', ballAtopPosition(carrier));
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
