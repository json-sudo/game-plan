import { expect, test, type Page } from '@playwright/test';
import type { Point } from '../src/data/types';

test.use({ viewport: { width: 1440, height: 900 } });

const TOKEN_NAME = /, (my team|opponent)$/;
const DRAG_DISTANCE_PX = 70;
const SAME_UNITS = 0.05;
const MOVED_UNITS = 5;

async function translateOf(page: Page, name: string): Promise<Point> {
  const style = await page.getByRole('button', { name, exact: true }).getAttribute('style');
  const match = style?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  if (!match) throw new Error(`no translate on ${name}: ${style}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

async function snapshot(page: Page): Promise<Map<string, Point>> {
  const buttons = page.getByRole('button', { name: TOKEN_NAME });
  const names = await buttons.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label') ?? node.textContent ?? ''),
  );
  const entries = await Promise.all(
    [...names, 'Ball'].map(async (name) => [name, await translateOf(page, name)] as const),
  );
  return new Map(entries);
}

async function settled(page: Page): Promise<Map<string, Point>> {
  let previous = await snapshot(page);
  await expect
    .poll(async () => {
      const current = await snapshot(page);
      const still = movedNames(previous, current).length === 0;
      previous = current;
      return still;
    })
    .toBe(true);
  return previous;
}

async function dragBy(page: Page, name: string, dx: number, dy: number) {
  const box = await page.getByRole('button', { name, exact: true }).boundingBox();
  if (!box) throw new Error(`${name} not laid out`);
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 8 });
  await page.mouse.up();
}

function travelled(before: Map<string, Point>, after: Map<string, Point>, name: string): number {
  return Math.hypot(
    after.get(name)!.x - before.get(name)!.x,
    after.get(name)!.y - before.get(name)!.y,
  );
}

function movedNames(before: Map<string, Point>, after: Map<string, Point>): string[] {
  return [...before]
    .filter(
      ([name, at]) => Math.hypot(after.get(name)!.x - at.x, after.get(name)!.y - at.y) > SAME_UNITS,
    )
    .map(([name]) => name);
}

async function applyMatchup(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('radio', { name: 'Open pitch', exact: true }).click();
  await page
    .getByRole('radiogroup', { name: 'My team' })
    .getByRole('radio', { name: '4-3-3 DM Wide' })
    .click();
  await page
    .getByRole('radiogroup', { name: 'Opponent' })
    .getByRole('radio', { name: '4-2-3-1 DM Wide' })
    .click();
  await page.getByRole('button', { name: 'Apply matchup' }).click();
  await expect(page.getByRole('button', { name: 'ST, my team', exact: true })).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).size).toBe(23);
}

test('after Apply, dragging one player or the ball moves only that object', async ({ page }) => {
  await applyMatchup(page);

  const beforePlayer = await snapshot(page);
  await dragBy(page, 'DM, my team', DRAG_DISTANCE_PX, -DRAG_DISTANCE_PX);
  await expect
    .poll(async () => travelled(beforePlayer, await snapshot(page), 'DM, my team'))
    .toBeGreaterThan(MOVED_UNITS);
  const afterPlayer = await settled(page);
  expect(movedNames(beforePlayer, afterPlayer)).toEqual(['DM, my team']);

  await dragBy(page, 'Ball', -DRAG_DISTANCE_PX, DRAG_DISTANCE_PX);
  await expect
    .poll(async () => travelled(afterPlayer, await snapshot(page), 'Ball'))
    .toBeGreaterThan(MOVED_UNITS);
  expect(movedNames(afterPlayer, await settled(page))).toEqual(['Ball']);
});

test('changing the FM configuration leaves the Open pitch layout unchanged', async ({ page }) => {
  await applyMatchup(page);
  const before = await snapshot(page);

  await page.getByRole('radio', { name: 'FM mode', exact: true }).click();
  await page
    .getByRole('radiogroup', { name: 'My team' })
    .getByRole('radio', { name: '4-2-3-1 DM Wide' })
    .click();
  await page.getByRole('radio', { name: 'Open pitch', exact: true }).click();

  await expect.poll(async () => movedNames(before, await snapshot(page))).toEqual([]);
});
