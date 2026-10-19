import { describe, expect, it } from 'vitest';
import type { Family, FormationSlot, SlotId } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { eligibleCarrierIds, type CarrierPlayer } from './carrier-eligibility';

const FOUR_BACK: readonly FormationSlot[] = [
  { id: 'DCL', family: 'D(C)', base: { x: 28, y: 75 } },
  { id: 'DCR', family: 'D(C)', base: { x: 48, y: 75 } },
];

const THREE_BACK: readonly FormationSlot[] = [
  { id: 'DCL', family: 'D(C)', base: { x: 20, y: 75 } },
  { id: 'DC', family: 'D(C)', base: { x: 38, y: 75 } },
  { id: 'DCR', family: 'D(C)', base: { x: 56, y: 75 } },
];

function player(
  id: string,
  roleId: string | undefined,
  family: Family | null,
  slot: SlotId | null,
  side?: 'left' | 'right',
): CarrierPlayer {
  return { id, roleId, family, slot, side };
}

const leftFullBack = player('lfb', 'full_back_ip', 'D(L)', 'DL', 'left');
const rightFullBack = player('rfb', 'full_back_ip', 'D(R)', 'DR', 'right');
const leftCentreBack = player('lcb', 'centre_back_ip', 'D(C)', 'DCL', 'left');
const rightCentreBack = player('rcb', 'centre_back_ip', 'D(C)', 'DCR', 'right');
const middleCentreBack = player('mcb', 'centre_back_ip', 'D(C)', 'DC');
const keeper = player('gk', 'goalkeeper_ip', 'GK', 'GK');

function idsFor(zone: ZoneId, players: readonly CarrierPlayer[], slots = FOUR_BACK) {
  return eligibleCarrierIds(zone, players, slots);
}

describe('eligibleCarrierIds - defensive third', () => {
  it('offers the left-side full-back roles on the left flank and never the other side', () => {
    const wingBack = player('lwb', 'wing_back_ip', 'WB(L)', 'WBL', 'left');
    const insideWingBack = player('liwb', 'inside_wing_back_ip', 'D(L)', 'DL', 'left');
    const insideFullBack = player('lifb', 'inside_full_back_ip', 'D(L)', 'DL', 'left');
    const players = [
      leftFullBack,
      rightFullBack,
      wingBack,
      insideWingBack,
      insideFullBack,
      leftCentreBack,
      keeper,
    ];
    expect(idsFor('L-D', players)).toEqual(['lfb', 'lwb', 'liwb', 'lifb']);
    expect(idsFor('R-D', players)).toEqual(['rfb']);
  });

  it('offers full-backs, Half Back and the left centre-back roles on the left half-space', () => {
    const halfBack = player('hb', 'half_back_ip', 'DM', 'DM');
    const advanced = player('acb', 'advanced_centre_back_ip', 'D(C)', 'DCL', 'left');
    const players = [leftFullBack, rightFullBack, halfBack, advanced, rightCentreBack, keeper];
    expect(idsFor('LH-D', players)).toEqual(['lfb', 'hb', 'acb']);
    expect(idsFor('RH-D', [leftFullBack, rightFullBack, rightCentreBack, leftCentreBack])).toEqual([
      'rfb',
      'rcb',
    ]);
  });

  it('offers every centre-back role and Half Back in the centre but no full-backs', () => {
    const halfBack = player('hb', 'half_back_ip', 'DM', 'DM');
    const ballPlaying = player('bpcb', 'ball_playing_centre_back_ip', 'D(C)', 'DCR', 'right');
    const noNonsense = player('nncb', 'no_nonsense_center_back_ip', 'D(C)', 'DC');
    const players = [leftFullBack, halfBack, leftCentreBack, ballPlaying, noNonsense, keeper];
    expect(idsFor('C-D', players)).toEqual(['hb', 'lcb', 'bpcb', 'nncb']);
  });

  it('does not depend on an Inside Full-Back being present', () => {
    expect(idsFor('C-D', [leftCentreBack, rightCentreBack])).toEqual(['lcb', 'rcb']);
  });

  it('uses the shirt role, not the coordinates, so a player with no role is never offered', () => {
    expect(idsFor('L-D', [player('bare', undefined, 'D(L)', 'DL', 'left')])).toEqual([]);
  });
});

describe('eligibleCarrierIds - Overlapping Centre-Back gate', () => {
  const overlapping = (id: string, slot: SlotId, side?: 'left' | 'right') =>
    player(id, 'overlapping_centre_back_ip', 'D(C)', slot, side);

  it('is offered only to an outermost centre-back in a formation with three centre-backs', () => {
    const left = overlapping('locb', 'DCL', 'left');
    const middle = overlapping('mocb', 'DC');
    const right = overlapping('rocb', 'DCR', 'right');
    const all = [left, middle, right];
    expect(eligibleCarrierIds('L-D', all, THREE_BACK)).toEqual(['locb']);
    expect(eligibleCarrierIds('R-D', all, THREE_BACK)).toEqual(['rocb']);
    expect(eligibleCarrierIds('LH-D', all, THREE_BACK)).toEqual(['locb']);
    expect(eligibleCarrierIds('RH-D', all, THREE_BACK)).toEqual(['rocb']);
    expect(eligibleCarrierIds('C-D', all, THREE_BACK)).toEqual(['locb', 'rocb']);
  });

  it('is never offered when the formation has fewer than three centre-backs', () => {
    const left = overlapping('locb', 'DCL', 'left');
    expect(eligibleCarrierIds('L-D', [left], FOUR_BACK)).toEqual([]);
    expect(eligibleCarrierIds('C-D', [left], FOUR_BACK)).toEqual([]);
  });

  it('is not offered outside the defensive third', () => {
    const left = overlapping('locb', 'DCL', 'left');
    expect(eligibleCarrierIds('L-M', [left], THREE_BACK)).toEqual([]);
    expect(eligibleCarrierIds('L-F', [left], THREE_BACK)).toEqual([]);
  });
});

describe('eligibleCarrierIds - Wide Centre-Back gate', () => {
  const wide = (id: string, slot: SlotId, side?: 'left' | 'right') =>
    player(id, 'wide_centre_back_ip', 'D(C)', slot, side);

  it('is offered in defensive flank and half-space only to the zone-side outermost centre-back', () => {
    const left = wide('lwcb', 'DCL', 'left');
    const middle = wide('mwcb', 'DC');
    const right = wide('rwcb', 'DCR', 'right');
    const all = [left, middle, right];
    expect(eligibleCarrierIds('L-D', all, THREE_BACK)).toEqual(['lwcb']);
    expect(eligibleCarrierIds('R-D', all, THREE_BACK)).toEqual(['rwcb']);
    expect(eligibleCarrierIds('LH-D', all, THREE_BACK)).toEqual(['lwcb']);
    expect(eligibleCarrierIds('RH-D', all, THREE_BACK)).toEqual(['rwcb']);
  });

  it('is never offered in the defensive centre', () => {
    const all = [wide('lwcb', 'DCL', 'left'), wide('rwcb', 'DCR', 'right')];
    expect(eligibleCarrierIds('C-D', all, THREE_BACK)).toEqual([]);
  });

  it('is never offered when the formation has fewer than three centre-backs', () => {
    const left = wide('lwcb', 'DCL', 'left');
    expect(eligibleCarrierIds('L-D', [left], FOUR_BACK)).toEqual([]);
    expect(eligibleCarrierIds('LH-D', [left], FOUR_BACK)).toEqual([]);
  });

  it('is not offered outside the defensive third', () => {
    const left = wide('lwcb', 'DCL', 'left');
    expect(eligibleCarrierIds('L-M', [left], THREE_BACK)).toEqual([]);
    expect(eligibleCarrierIds('LH-F', [left], THREE_BACK)).toEqual([]);
  });
});

describe('eligibleCarrierIds - middle third', () => {
  const leftWinger = player('lw', 'winger_ip', 'AM(L)', 'AML', 'left');
  const rightWinger = player('rw', 'winger_ip', 'AM(R)', 'AMR', 'right');
  const insideForward = player('lif', 'inside_forward_ip', 'AM(L)', 'AML', 'left');
  const playmakingWinger = player('lpw', 'playmaking_winger_ip', 'AM(L)', 'AML', 'left');
  const wideForward = player('lwf', 'wide_forward_ip', 'AM(L)', 'AML', 'left');
  const insideWinger = player('liw', 'inside_winger_ip', 'AM(L)', 'AML', 'left');
  const wideMidfielder = player('lwm', 'wide_midfielder_ip', 'M(L)', 'MCL', 'left');
  const wideCentre = player('lwcm', 'wide_central_midfielder_ip', 'M(C)', 'MCL', 'left');
  const rightWideCentre = player('rwcm', 'wide_central_midfielder_ip', 'M(C)', 'MCR', 'right');
  const wingBack = player('lwb', 'wing_back_ip', 'WB(L)', 'WBL', 'left');
  const channel = player('lch', 'channel_midfielder_ip', 'M(C)', 'MCL', 'left');
  const centralMid = player('cm', 'central_midfielder_ip', 'M(C)', 'MCL', 'left');
  const striker = player('st', 'poacher_ip', 'ST', 'ST');
  const everyone = [
    leftFullBack,
    rightFullBack,
    wingBack,
    wideCentre,
    rightWideCentre,
    wideMidfielder,
    leftWinger,
    rightWinger,
    insideForward,
    playmakingWinger,
    wideForward,
    insideWinger,
    channel,
    centralMid,
    striker,
    keeper,
  ];

  it('offers wide roles of the zone side on the flank', () => {
    expect(idsFor('L-M', everyone)).toEqual([
      'lfb',
      'lwb',
      'lwcm',
      'lwm',
      'lw',
      'lif',
      'lpw',
      'lwf',
      'liw',
    ]);
    expect(idsFor('R-M', everyone)).toEqual(['rfb', 'rwcm', 'rw']);
  });

  it('drops Winger and Wide Forward on the half-space and adds Channel Midfielder', () => {
    expect(idsFor('LH-M', everyone)).toEqual([
      'lfb',
      'lwb',
      'lwcm',
      'lwm',
      'lif',
      'lpw',
      'liw',
      'lch',
    ]);
    expect(idsFor('RH-M', everyone)).toEqual(['rfb', 'rwcm', 'lch']);
  });

  it('offers a central Channel Midfielder in either half-space', () => {
    const centralChannel = player('central-channel', 'channel_midfielder_ip', 'AM(C)', 'AMC');
    expect(idsFor('LH-M', [centralChannel])).toEqual(['central-channel']);
    expect(idsFor('RH-M', [centralChannel])).toEqual(['central-channel']);
  });

  it('offers only the central midfield and False Nine roles in the centre', () => {
    const roles: [string, Family, SlotId][] = [
      ['central_midfielder_ip', 'M(C)', 'MCL'],
      ['midfield_playmaker_ip', 'M(C)', 'MCR'],
      ['attacking_midfielder_ip', 'AM(C)', 'AMC'],
      ['advanced_playmaker_ip', 'AM(C)', 'AMC'],
      ['free_role_ip', 'AM(C)', 'AMC'],
      ['false_nine_ip', 'ST', 'ST'],
    ];
    const eligible = roles.map(([role, family, slot]) => player(role, role, family, slot));
    const excluded = [
      'wide_central_midfielder_ip',
      'channel_midfielder_ip',
      'second_striker_ip',
      'defensive_midfielder_ip',
      'deep_lying_playmaker_ip',
      'box_to_box_midfielder_ip',
      'half_back_ip',
    ].map((role) => player(role, role, 'DM', 'DM'));
    expect(idsFor('C-M', [...excluded, ...eligible])).toEqual(roles.map(([role]) => role));
  });
});

describe('eligibleCarrierIds - final third', () => {
  const winger = player('lw', 'winger_ip', 'AM(L)', 'AML', 'left');
  const playmakingWinger = player('lpw', 'playmaking_winger_ip', 'AM(L)', 'AML', 'left');
  const insideForward = player('lif', 'inside_forward_ip', 'AM(L)', 'AML', 'left');
  const wingBack = player('lwb', 'wing_back_ip', 'WB(L)', 'WBL', 'left');
  const advancedWingBack = player('lawb', 'advanced_wing_back_ip', 'WB(L)', 'WBL', 'left');
  const fullBackAdvanced = player('lfbadv', 'advanced_wing_back_ip', 'D(L)', 'DL', 'left');
  const poacher = player('st', 'poacher_ip', 'ST', 'ST');
  const falseNine = player('fn', 'false_nine_ip', 'ST', 'STL', 'left');
  const secondStriker = player('ss', 'second_striker_ip', 'AM(C)', 'AMC');
  const attackingMid = player('am', 'attacking_midfielder_ip', 'AM(C)', 'AMC');
  const advancedPlaymaker = player('ap', 'advanced_playmaker_ip', 'AM(C)', 'AMC');
  const channel = player('ch', 'channel_midfielder_ip', 'M(C)', 'MCR', 'right');
  const leftChannel = player('lch', 'channel_midfielder_ip', 'M(C)', 'MCL', 'left');
  const insideWinger = player('liw', 'inside_winger_ip', 'AM(L)', 'AML', 'left');

  it('offers wide attackers and wing-backs on the flank but never Playmaking Winger', () => {
    const players = [winger, playmakingWinger, insideForward, wingBack, leftFullBack, poacher];
    expect(idsFor('L-F', players)).toEqual(['lw', 'lif', 'lwb']);
    expect(idsFor('R-F', players)).toEqual([]);
  });

  it('offers Advanced Wing-Back on the flank only from a Wing-Back position', () => {
    expect(idsFor('L-F', [advancedWingBack, fullBackAdvanced])).toEqual(['lawb']);
  });

  it('offers every striker role in the centre, plus Second Striker from AM(C)', () => {
    const players = [poacher, falseNine, secondStriker, attackingMid, winger];
    expect(idsFor('C-F', players)).toEqual(['st', 'fn', 'ss']);
  });

  it('offers strikers and central creators on the half-spaces, with wide roles of that side', () => {
    const players = [
      poacher,
      secondStriker,
      attackingMid,
      advancedPlaymaker,
      insideForward,
      insideWinger,
      playmakingWinger,
      winger,
      channel,
      leftChannel,
    ];
    expect(idsFor('LH-F', players)).toEqual([
      'st',
      'ss',
      'am',
      'ap',
      'lif',
      'liw',
      'lpw',
      'ch',
      'lch',
    ]);
    expect(idsFor('RH-F', players)).toEqual(['st', 'ss', 'am', 'ap', 'ch', 'lch']);
  });
});

describe('eligibleCarrierIds - general rules', () => {
  it('never offers a goalkeeper', () => {
    for (const zone of ['L-D', 'LH-D', 'C-D', 'L-M', 'C-M', 'C-F'] as const) {
      expect(idsFor(zone, [keeper])).toEqual([]);
    }
  });

  it('keeps the order of the players it is given', () => {
    expect(idsFor('C-D', [rightCentreBack, leftCentreBack, middleCentreBack])).toEqual([
      'rcb',
      'lcb',
      'mcb',
    ]);
  });
});
