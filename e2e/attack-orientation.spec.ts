import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Side } from '../src/data/types';
import { encodeShareHash } from '../src/share';
import { applyTacticAction } from '../src/state/tactic-actions';
import { createExampleTactic } from '../src/state/tactic';
import type { Action } from '../src/state/actions';

test.use({ viewport: { width: 1440, height: 900 } });

const TEAM_NAMES: Record<Side, string> = { mine: 'My team', opponent: 'Opponent' };
const TEAM_LABELS: Record<Side, string> = { mine: 'my team', opponent: 'opponent' };
const WALK_ON_MIN_PX = 5;
const MAX_ATTACHMENT_DX_PX = 4;
const MAX_ATTACHMENT_DY_PX = 45;

function actionsFor(attacker: Side): Action[] {
  return [
    { type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' },
    { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
    { type: 'applyMatchup' },
    { type: 'setAttacker', attacker },
    { type: 'fillDefaultRoles' },
    { type: 'tapZone', zone: 'C-M' },
  ];
}

function linkFor(attacker: Side): string {
  const tactic = actionsFor(attacker).reduce(
    (current, action) => applyTacticAction(current, 'fm', action),
    createExampleTactic(),
  );
  const encoded = encodeShareHash({ tactic, mode: 'fm' });
  if (encoded.status !== 'ok') throw new Error('expected the tactic to fit in a link');
  return `/${encoded.hash}`;
}

async function centreY(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('not laid out');
  return box.y + box.height / 2;
}

async function meanY(page: Page, side: Side): Promise<number> {
  const tokens = page.getByRole('img', {
    name: new RegExp(`^(?!GK).*${TEAM_LABELS[side]}$`),
  });
  const count = await tokens.count();
  expect(count, `no outfield tokens rendered for ${side}`).toBeGreaterThan(0);
  const ys = await Promise.all(
    Array.from({ length: count }, (_, index) => centreY(tokens.nth(index))),
  );
  return ys.reduce((sum, y) => sum + y, 0) / count;
}

for (const attacker of ['mine', 'opponent'] as const) {
  const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';

  test(`${attacker} attacking: names, zone map, ball and walk-on agree on the upward display`, async ({
    page,
  }, testInfo) => {
    await page.goto(linkFor(attacker));
    const pitch = page.getByRole('img', { name: 'Pitch', exact: true });
    await expect(pitch).toBeVisible();
    await expect(page.getByRole('img', { name: /^(?!GK).*my team$/ }).first()).toBeVisible();

    const pitchBox = await pitch.boundingBox();
    if (!pitchBox) throw new Error('pitch not laid out');
    const pitchMid = pitchBox.y + pitchBox.height / 2;

    const entering = {
      attacker: await meanY(page, attacker),
      defender: await meanY(page, defender),
    };

    await expect.poll(() => meanY(page, attacker)).toBeLessThan(entering.attacker - WALK_ON_MIN_PX);
    await expect
      .poll(() => meanY(page, defender))
      .toBeGreaterThan(entering.defender + WALK_ON_MIN_PX);
    const keeperY = (side: Side) =>
      centreY(page.getByRole('img', { name: new RegExp(`^GK, .*${TEAM_LABELS[side]}$`) }));
    expect(await keeperY(attacker)).toBeGreaterThan(pitchMid);
    expect(await keeperY(defender)).toBeLessThan(pitchMid);

    const attackerRow = page.getByRole('group', { name: TEAM_NAMES[attacker], exact: true });
    const defenderRow = page.getByRole('group', { name: TEAM_NAMES[defender], exact: true });
    expect(await centreY(attackerRow)).toBeGreaterThan(pitchMid);
    expect(await centreY(defenderRow)).toBeLessThan(pitchMid);

    const finalThird = page.getByRole('button', { name: 'Centre - final third' });
    const defensiveThird = page.getByRole('button', { name: 'Centre - defensive third' });
    expect(await centreY(finalThird)).toBeLessThan(await centreY(defensiveThird));
    await expect(page.getByText(`${TEAM_NAMES[attacker]} ↑`)).toBeVisible();

    const ballAttachedAbove = async () => {
      const ball = await page.getByRole('img', { name: 'Ball', exact: true }).boundingBox();
      if (!ball) return false;
      const tokens = page.getByRole('img', {
        name: new RegExp(`^(?!GK).*${TEAM_LABELS[attacker]}$`),
      });
      const boxes = await Promise.all(
        Array.from({ length: await tokens.count() }, (_, index) => tokens.nth(index).boundingBox()),
      );
      return boxes.some(
        (box) =>
          box !== null &&
          Math.abs(box.x + box.width / 2 - (ball.x + ball.width / 2)) < MAX_ATTACHMENT_DX_PX &&
          box.y + box.height / 2 - (ball.y + ball.height / 2) > 0 &&
          box.y + box.height / 2 - (ball.y + ball.height / 2) < MAX_ATTACHMENT_DY_PX,
      );
    };
    await expect.poll(ballAttachedAbove).toBe(true);

    await page.screenshot({ path: testInfo.outputPath(`attack-${attacker}.png`) });
  });
}
