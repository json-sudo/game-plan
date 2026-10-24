import type { Point } from '../../data/types';
import type { Third } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import type { SlotLine } from './formation-anchors';
import { FLANK, HALF_SPACE } from './role-regions';

export interface InteractionEntry {
  id: string;
  roleId: string | undefined;
  side: -1 | 0 | 1;
  attacking: boolean;
  line: SlotLine;
}

type Update = readonly [id: string, point: Point];
type SideRoles = Partial<Record<RoleKey, InteractionEntry>>;
type RoleKey = keyof typeof ROLE_KEYS;

const ROLE_KEYS = {
  winger: 'winger_ip',
  wingBack: 'wing_back_ip',
  advancedWingBack: 'advanced_wing_back_ip',
  overlapping: 'overlapping_centre_back_ip',
  channel: 'channel_midfielder_ip',
} as const;

const INSIDE_WING_BACK = 'inside_wing_back_ip';
const PAIR_Y = { wingBack: 25, winger: 18, overlapping: 37 };
const ADVANCED_FLANK_Y = 23;
const CHANNEL_SHARED_Y = { winger: 18, wingBack: 25, channel: 27 };
const UNDERLAP_Y = 32;
const UNDERLAP_DROP_Y = 37;
const PIVOT_CLEARANCE = 5;
const PIVOT_STAGGER = 5;

export function edgeX(side: -1 | 0 | 1, edge: number): number {
  return side < 0 ? edge : PITCH_W - edge;
}

function sideRoles(entries: readonly InteractionEntry[], side: -1 | 1): SideRoles {
  const onSide = entries.filter((entry) => entry.attacking && entry.side === side);
  return Object.fromEntries(
    (Object.keys(ROLE_KEYS) as RoleKey[]).flatMap((key) => {
      const found = onSide.find((entry) => entry.roleId === ROLE_KEYS[key]);
      return found ? [[key, found]] : [];
    }),
  );
}

function withUpdates(points: ReadonlyMap<string, Point>, updates: readonly Update[]) {
  return new Map<string, Point>([...points, ...updates]);
}

function widestToFlank(
  side: -1 | 1,
  roles: SideRoles,
  points: ReadonlyMap<string, Point>,
): Update[] {
  const ranked = [roles.winger, roles.wingBack, roles.overlapping, roles.advancedWingBack].filter(
    (entry): entry is InteractionEntry => entry !== undefined,
  );
  if (ranked.length < 2) return [];
  const widest = ranked[ranked.length - 1];
  return ranked.map((entry): Update => {
    const x = edgeX(side, entry === widest ? FLANK : HALF_SPACE);
    return [entry.id, { x, y: points.get(entry.id)!.y }];
  });
}

function underlap(
  side: -1 | 1,
  roles: SideRoles,
  entries: readonly InteractionEntry[],
  points: ReadonlyMap<string, Point>,
): Update[] {
  const overlapping = roles.overlapping!;
  const target = { x: edgeX(side, HALF_SPACE), y: UNDERLAP_Y };
  const crowded = entries.some((entry) => {
    const point = points.get(entry.id)!;
    return (
      entry.attacking &&
      entry.id !== overlapping.id &&
      Math.hypot(point.x - target.x, point.y - target.y) < PIVOT_CLEARANCE
    );
  });
  return [[overlapping.id, { x: target.x, y: crowded ? UNDERLAP_DROP_Y : UNDERLAP_Y }]];
}

function finalThirdSide(
  side: -1 | 1,
  entries: readonly InteractionEntry[],
  points: ReadonlyMap<string, Point>,
): Update[] {
  const roles = sideRoles(entries, side);
  const { winger, wingBack, advancedWingBack, overlapping, channel } = roles;
  const flank = (entry: InteractionEntry, y: number): Update => [
    entry.id,
    { x: edgeX(side, FLANK), y },
  ];
  const half = (entry: InteractionEntry, y: number): Update => [
    entry.id,
    { x: edgeX(side, HALF_SPACE), y },
  ];
  if (winger && wingBack && overlapping) {
    return [
      flank(wingBack, PAIR_Y.wingBack),
      half(winger, PAIR_Y.winger),
      half(overlapping, PAIR_Y.overlapping),
    ];
  }
  if (winger && advancedWingBack && overlapping) {
    return [
      flank(advancedWingBack, ADVANCED_FLANK_Y),
      half(winger, PAIR_Y.winger),
      half(overlapping, PAIR_Y.overlapping),
    ];
  }
  if (winger && wingBack && channel) {
    return [
      flank(winger, CHANNEL_SHARED_Y.winger),
      flank(wingBack, CHANNEL_SHARED_Y.wingBack),
      half(channel, CHANNEL_SHARED_Y.channel),
    ];
  }
  if (winger && wingBack) {
    return [flank(wingBack, PAIR_Y.wingBack), half(winger, PAIR_Y.winger)];
  }
  if (overlapping && (winger || wingBack || advancedWingBack)) {
    return underlap(side, roles, entries, points);
  }
  return widestToFlank(side, roles, points);
}

function finalThird(entries: readonly InteractionEntry[], points: ReadonlyMap<string, Point>) {
  return ([-1, 1] as const).reduce(
    (current, side) => withUpdates(current, finalThirdSide(side, entries, current)),
    points,
  );
}

function middleThird(entries: readonly InteractionEntry[], points: ReadonlyMap<string, Point>) {
  const updates = ([-1, 1] as const).flatMap((side): Update[] => {
    const { overlapping, wingBack, advancedWingBack } = sideRoles(entries, side);
    if (!overlapping || !(wingBack || advancedWingBack)) return [];
    return [[overlapping.id, { x: edgeX(side, HALF_SPACE), y: points.get(overlapping.id)!.y }]];
  });
  return withUpdates(points, updates);
}

function staggerInsideWingBacks(
  entries: readonly InteractionEntry[],
  points: ReadonlyMap<string, Point>,
) {
  const pivots = entries
    .filter((entry) => entry.attacking && entry.line === 'DM')
    .map((entry) => points.get(entry.id)!);
  const updates = entries
    .filter((entry) => entry.attacking && entry.roleId === INSIDE_WING_BACK)
    .flatMap((entry): Update[] => {
      const point = points.get(entry.id)!;
      const blocker = pivots.find(
        (pivot) =>
          Math.abs(pivot.x - point.x) < PIVOT_CLEARANCE &&
          Math.abs(pivot.y - point.y) < PIVOT_CLEARANCE,
      );
      return blocker ? [[entry.id, { x: point.x, y: blocker.y - PIVOT_STAGGER }]] : [];
    });
  return withUpdates(points, updates);
}

export function applyInteractions(
  entries: readonly InteractionEntry[],
  points: ReadonlyMap<string, Point>,
  third: Third,
): Map<string, Point> {
  const lanes =
    third === 'F'
      ? finalThird(entries, points)
      : third === 'M'
        ? middleThird(entries, points)
        : points;
  return staggerInsideWingBacks(entries, lanes);
}
