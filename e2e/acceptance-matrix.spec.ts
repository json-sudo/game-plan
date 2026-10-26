import { expect, test, type Page, type TestInfo } from '@playwright/test';
import referenceJson from '../src/engine/fm/fixtures/reference-openings.json' with { type: 'json' };
import { FM26_DATA } from '../src/data/fm26';
import type { Side } from '../src/data/types';
import type { ZoneId } from '../src/data/zones';
import { encodeShareHash } from '../src/share';
import { applyAction, createInitialDocument, tacticFromDocument } from '../src/state';
import type { Action } from '../src/state';
import {
  HALF_BACK_IWB,
  OCB_ALONE,
  ONE_IFB,
  R01,
  R02,
  TWO_IFB,
  WINGER_WING_BACK,
  type Scenario,
} from '../src/test-utils/role-scenarios';

const THEME_STORAGE_KEY = 'game-plan:theme';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const VIEWPORTS = { phone: PHONE, desktop: DESKTOP } as const;
const THEMES = ['light', 'dark'] as const;
const MOTIONS = ['normal', 'reduced'] as const;
const PASS_MS = { normal: 900, reduced: 200 } as const;
const OPENING_SETTLE_MS = { normal: 1400, reduced: 600 } as const;
const PASS_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;
const PAUSE_LEAD_MS = 1000;
const STEP_MS = 10;
const MAX_STEPS = 400;
const ATTACHMENT_OFFSET = 3.7;
const ATTACHED_TOLERANCE = 0.05;
const BODY_OVERLAP_TOLERANCE_PX = 0.5;
const INTERRUPTION_JUMP_PX = 2;
const LONG_NAME = 'Maximilian-Wolfgang';
const REFERENCE_FORMATIONS = referenceJson.formations;
const REFERENCE_ROLES = referenceJson.roles as Record<string, string>;
const SHOT_DIR = 'acceptance-matrix';

interface Config {
  mine: string;
  opponent: string | null;
  attacker?: Side;
  zone: ZoneId;
  roles?: Readonly<Record<string, string>>;
  names?: boolean;
}

interface VisualCase {
  name: string;
  config: Config;
}

function scenarioRoles(scenario: Scenario): Record<string, string> {
  return Object.fromEntries(
    Object.entries(scenario.roles).map(([slot, role]) => [
      `${scenario.defending ? 'opponent' : 'mine'}:${slot}`,
      role,
    ]),
  );
}

const reference = (zone: ZoneId): Config => ({
  mine: REFERENCE_FORMATIONS.mine,
  opponent: REFERENCE_FORMATIONS.opponent,
  zone,
  roles: REFERENCE_ROLES,
});

const attackingScenario = (scenario: Scenario, zone: ZoneId): Config => ({
  mine: scenario.formation,
  opponent: REFERENCE_FORMATIONS.opponent,
  zone,
  roles: scenarioRoles(scenario),
});

const CASES: VisualCase[] = [
  { name: 'reference-defensive-centre', config: reference('C-D') },
  { name: 'reference-left-half-space-middle', config: reference('LH-M') },
  { name: 'reference-left-half-space-final', config: reference('LH-F') },
  { name: 'one-sided-ifb', config: attackingScenario(ONE_IFB, 'L-D') },
  { name: 'two-sided-ifb', config: attackingScenario(TWO_IFB, 'L-D') },
  { name: 'half-back-with-iwb', config: attackingScenario(HALF_BACK_IWB, 'C-M') },
  { name: 'wing-back-and-winger', config: attackingScenario(WINGER_WING_BACK, 'L-F') },
  { name: 'wing-back-winger-channel-midfielder', config: attackingScenario(R02, 'L-F') },
  { name: 'ocb-trio-after-r01', config: attackingScenario(R01, 'L-F') },
  { name: 'ocb-alone', config: attackingScenario(OCB_ALONE, 'L-M') },
  {
    name: 'narrow-diamond',
    config: { mine: '4_4_2_diamond_narrow', opponent: REFERENCE_FORMATIONS.opponent, zone: 'C-M' },
  },
  {
    name: 'three-two-four-one-without-full-backs',
    config: { mine: '3_2_4_1', opponent: REFERENCE_FORMATIONS.opponent, zone: 'LH-M' },
  },
  {
    name: 'five-back-double-dm',
    config: { mine: '5_2_1_2_dm_wb', opponent: REFERENCE_FORMATIONS.opponent, zone: 'C-D' },
  },
  {
    name: 'opponent-attacking',
    config: { ...reference('C-M'), attacker: 'opponent', roles: undefined },
  },
  { name: 'no-opponent', config: { mine: REFERENCE_FORMATIONS.mine, opponent: null, zone: 'R-F' } },
  { name: 'phone-labels', config: { ...reference('LH-M'), names: true } },
];

const PASS_CASES = [CASES[2], CASES[8], CASES[13]];

function documentFor(config: Config) {
  const apply = (doc: ReturnType<typeof createInitialDocument>, action: Action) =>
    applyAction(doc, action, FM26_DATA);
  const formations: Action[] = [
    { type: 'applyFormation', team: 'mine', formationId: config.mine },
    ...(config.opponent
      ? [
          { type: 'applyFormation', team: 'opponent', formationId: config.opponent } as const,
          { type: 'applyMatchup' } as const,
        ]
      : []),
    { type: 'fillDefaultRoles' },
  ];
  const withFormations = formations.reduce(apply, createInitialDocument());
  const playerId = (key: string) => {
    const [team, slot] = key.split(':');
    return withFormations.players.find((player) => player.team === team && player.slot === slot)!
      .id;
  };
  const setRoles: Action[] = Object.entries(config.roles ?? {}).flatMap(([key, roleId]) =>
    config.opponent || key.startsWith('mine:')
      ? [{ type: 'setRole', playerId: playerId(key), roleId } as const]
      : [],
  );
  const setNames: Action[] = config.names
    ? withFormations.players
        .filter((player) => player.team === 'mine' && !player.isKeeper && player.slot)
        .map((player) => ({ type: 'setPieceName', playerId: player.id, name: LONG_NAME }) as const)
    : [];
  const tail: Action[] = [
    ...(config.attacker ? [{ type: 'setAttacker', attacker: config.attacker } as const] : []),
    { type: 'tapZone', zone: config.zone },
  ];
  return [...setRoles, ...setNames, ...tail].reduce(apply, withFormations);
}

function linkFor(config: Config): string {
  const encoded = encodeShareHash({
    tactic: tacticFromDocument(documentFor(config), 'fm'),
    mode: 'fm',
  });
  if (encoded.status !== 'ok') throw new Error(encoded.message);
  return `/${encoded.hash}`;
}

interface Box {
  x: number;
  y: number;
  w: number;
}

interface Geometry {
  svg: { left: number; right: number; top: number; bottom: number };
  scrollW: number;
  wide: string[];
  clientW: number;
  bodies: Box[];
  tokens: { x: number; y: number }[];
  ball: Box;
  plates: { left: number; right: number; top: number; bottom: number }[];
}

function readGeometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const centre = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, w: rect.width };
    };
    const svg = document.querySelector('svg[role="img"]')!.getBoundingClientRect();
    const ball = document.querySelector('g[aria-label="Ball"]')!;
    const ballBody = ball.querySelector('circle') ?? ball;
    return {
      svg: { left: svg.left, right: svg.right, top: svg.top, bottom: svg.bottom },
      scrollW: document.documentElement.scrollWidth,
      wide: [...document.querySelectorAll('body *')]
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 4)
        .map(
          (element) =>
            `${element.tagName} ${(element.textContent ?? '').slice(0, 40)} ${Math.round(element.getBoundingClientRect().right)}`,
        ),
      clientW: document.documentElement.clientWidth,
      bodies: [...document.querySelectorAll('g[data-team] [data-part="body"]')].map(centre),
      tokens: [...document.querySelectorAll<SVGGElement>('g[data-team]')].map((token) => {
        const match = token.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        return { x: Number(match?.[1]), y: Number(match?.[2]) };
      }),
      ball: centre(ballBody),
      plates: [...document.querySelectorAll('g[data-team] [class*="name-plate"]')].map((plate) => {
        const rect = plate.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }),
    };
  });
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestIndex(geometry: Geometry, excluded: readonly number[] = []): number {
  const candidates = geometry.bodies
    .map((body, index) => ({ index, gap: distance(body, geometry.ball) }))
    .filter(({ index }) => !excluded.includes(index));
  return candidates.reduce((best, next) => (next.gap < best.gap ? next : best)).index;
}

function layoutProblems(geometry: Geometry, related: readonly number[] | null): string[] {
  const problems: string[] = [];
  const { svg, bodies, ball, plates } = geometry;
  if (geometry.scrollW > geometry.clientW)
    problems.push(`horizontal overflow: ${geometry.wide.join(', ')}`);
  bodies.forEach((body, index) => {
    const half = body.w / 2;
    if (
      body.x - half < svg.left - 0.5 ||
      body.x + half > svg.right + 0.5 ||
      body.y - half < svg.top - 0.5 ||
      body.y + half > svg.bottom + 0.5
    ) {
      problems.push(`token ${index} clipped`);
    }
    if (related && !related.includes(index) && distance(body, ball) < half + ball.w / 2) {
      problems.push(
        `ball overlaps token ${index} (gap ${distance(body, ball).toFixed(1)} < ${(half + ball.w / 2).toFixed(1)})`,
      );
    }
    plates.forEach((plate, plateIndex) => {
      const covers =
        ball.x > plate.left && ball.x < plate.right && ball.y > plate.top && ball.y < plate.bottom;
      if (related && covers) problems.push(`name plate ${plateIndex} covers the ball`);
    });
    for (let other = index + 1; other < bodies.length; other += 1) {
      const limit = (body.w + bodies[other].w) / 2 - BODY_OVERLAP_TOLERANCE_PX;
      if (distance(body, bodies[other]) < limit) problems.push(`tokens ${index}/${other} overlap`);
    }
  });
  return problems;
}

async function loadCase(page: Page, config: Config, theme: string, reducedMotion: boolean) {
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [THEME_STORAGE_KEY, theme],
  );
  await page.clock.install({ time: 0 });
  await page.goto(linkFor(config));
  await expect(page.getByText(/^Starts with /)).toBeVisible();
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + PAUSE_LEAD_MS);
  await page.getByRole('button', { name: 'Restart' }).click();
}

async function settleOpening(page: Page, motion: keyof typeof OPENING_SETTLE_MS) {
  await page.clock.runFor(OPENING_SETTLE_MS[motion]);
}

async function save(page: Page, testInfo: TestInfo, label: string) {
  const path = testInfo.outputPath(SHOT_DIR, `${label}.png`);
  await page.screenshot({ path });
  await testInfo.attach(label, { path, contentType: 'image/png' });
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of THEMES) {
    for (const motion of MOTIONS) {
      test.describe(`${viewportName} ${theme} ${motion}`, () => {
        test.use({ viewport });

        for (const { name, config } of CASES) {
          test(`${name} has no overflow, clipping or body/ball overlap`, async ({
            page,
          }, testInfo) => {
            await loadCase(page, config, theme, motion === 'reduced');
            await settleOpening(page, motion);
            const geometry = await readGeometry(page);
            expect(layoutProblems(geometry, [nearestIndex(geometry)])).toEqual([]);
            await save(page, testInfo, `${name}-${viewportName}-${theme}-${motion}`);
          });
        }
      });
    }
  }
}

interface PassFrame {
  fraction: number;
  geometry: Geometry;
}

async function attachedTokenIndex(page: Page): Promise<number | null> {
  return page.evaluate(
    ([offset, tolerance]) => {
      const read = (element: Element) => {
        const match = (element as SVGGElement).style.transform.match(
          /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
        );
        return { x: Number(match?.[1]), y: Number(match?.[2]) };
      };
      const ball = read(document.querySelector('g[aria-label="Ball"]')!);
      const tokens = [...document.querySelectorAll('g[data-team="mine"], g[data-team="opponent"]')];
      const index = tokens.findIndex((token) => {
        const point = read(token);
        return (
          Math.abs(ball.x - point.x) < tolerance && Math.abs(point.y - ball.y - offset) < tolerance
        );
      });
      return index === -1 ? null : index;
    },
    [ATTACHMENT_OFFSET, ATTACHED_TOLERANCE],
  );
}

async function advanceToPassStart(page: Page): Promise<number> {
  let carrier = await attachedTokenIndex(page);
  for (let step = 0; step < MAX_STEPS; step += 1) {
    await page.clock.runFor(STEP_MS);
    const next = await attachedTokenIndex(page);
    if (carrier !== null && next === null) return carrier;
    carrier = next ?? carrier;
  }
  throw new Error('no pass started');
}

async function capturePass(page: Page, motion: keyof typeof PASS_MS) {
  const passMs = PASS_MS[motion];
  const carrier = await advanceToPassStart(page);
  const frames: PassFrame[] = [{ fraction: 0, geometry: await readGeometry(page) }];
  let elapsed = STEP_MS;
  for (const fraction of PASS_FRACTIONS.slice(1)) {
    const target = Math.round(passMs * fraction);
    await page.clock.runFor(Math.max(target - elapsed, 0));
    elapsed = target;
    frames.push({ fraction, geometry: await readGeometry(page) });
  }
  const receiver = (await attachedTokenIndex(page))!;
  return { carrier, receiver, frames };
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of THEMES) {
    for (const motion of MOTIONS) {
      test.describe(`pass progress ${viewportName} ${theme} ${motion}`, () => {
        test.use({ viewport });

        for (const { name, config } of PASS_CASES) {
          test(`${name} keeps clear of unrelated bodies at 0, 25, 50, 75 and 100 percent`, async ({
            page,
          }, testInfo) => {
            await loadCase(page, config, theme, motion === 'reduced');
            const { carrier, receiver, frames } = await capturePass(page, motion);
            expect(receiver).not.toBe(carrier);
            for (const { fraction, geometry } of frames) {
              const attached = fraction === 0 || fraction === 1;
              const related = attached ? [carrier, receiver] : null;
              expect(layoutProblems(geometry, related), `${name} at ${fraction * 100}%`).toEqual(
                [],
              );
            }
            const [start, middle, end] = [frames[0], frames[2], frames[4]].map(
              ({ geometry }) => geometry.ball,
            );
            expect(distance(start, end)).toBeGreaterThan(0);
            expect(distance(start, middle)).toBeGreaterThan(0);
            expect(distance(middle, end)).toBeGreaterThan(0);
            await save(page, testInfo, `${name}-pass-100-${viewportName}-${theme}-${motion}`);
          });
        }
      });
    }
  }
}

test.describe('interruption and export mid-pass', () => {
  test.use({ viewport: DESKTOP });

  test('changing the zone mid-pass starts from the sampled scene without a jump', async ({
    page,
  }, testInfo) => {
    await loadCase(page, CASES[2].config, 'light', false);
    await advanceToPassStart(page);
    await page.clock.runFor(PASS_MS.normal / 2);
    const before = await readGeometry(page);
    await page.getByRole('button', { name: 'Left flank - middle third' }).click();
    await page.clock.runFor(1);
    const after = await readGeometry(page);
    const jumps = before.tokens.map((token, index) => distance(token, after.tokens[index]));
    expect(Math.max(...jumps)).toBeLessThan(INTERRUPTION_JUMP_PX);
    expect(distance(before.ball, after.ball)).toBeLessThan(INTERRUPTION_JUMP_PX);
    await page.clock.runFor(OPENING_SETTLE_MS.normal);
    const settled = await readGeometry(page);
    expect(layoutProblems(settled, [nearestIndex(settled)])).toEqual([]);
    await save(page, testInfo, 'interruption-mid-pass-desktop-light-normal');
  });

  test('export mid-pass opens a preview and leaves the display unchanged', async ({
    page,
  }, testInfo) => {
    await loadCase(page, CASES[2].config, 'light', false);
    await advanceToPassStart(page);
    await page.clock.runFor(PASS_MS.normal / 2);
    const before = await readGeometry(page);
    await page.getByRole('button', { name: 'Export PNG' }).click();
    await expect(page.getByRole('img', { name: 'Preview of the exported image' })).toBeVisible();
    await save(page, testInfo, 'export-mid-pass-desktop-light-normal');
    await page.getByRole('button', { name: 'Cancel' }).click();
    const after = await readGeometry(page);
    expect(after.tokens.length).toBe(before.tokens.length);
  });
});
