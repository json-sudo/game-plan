import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRIBBLE_STEP, MOTION_DURATIONS_MS, ballAtopPosition } from '../../../engine';
import { applyAction, type Action } from '../../../state/actions';
import { createInitialDocument } from '../../../state/document';
import { createExampleDocument, EXAMPLE_CARRIER } from '../../../state/example';
import { selectPhasePositions } from '../../../state/selectors';
import { createPitchStore } from '../../../state/store';
import { BoardDesktop } from '.';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

type Frame = (timestamp: number) => void;

let frames: Map<number, Frame>;
let nextHandle: number;
let clock: number;

function tick(elapsed: number) {
  clock += elapsed;
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((frame) => frame(clock)));
}

function useMotion(reduced: boolean) {
  frames = new Map();
  nextHandle = 1;
  clock = 0;
  vi.stubGlobal('requestAnimationFrame', (frame: Frame) => {
    const handle = nextHandle++;
    frames.set(handle, frame);
    return handle;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle));
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => useMotion(false));
afterEach(() => vi.unstubAllGlobals());

function translation(element: Element) {
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(
    (element as HTMLElement).style.transform,
  );
  if (!match) throw new Error('no translation');
  return { x: Number(match[1]), y: Number(match[2]) };
}

function fmBoard() {
  const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
  render(<BoardDesktop store={store} />);
  return store;
}

function token(name: string) {
  return screen.getByRole('button', { name });
}

function tokenPoints() {
  const pitch = screen.getByRole('img', { name: 'Pitch' });
  return within(pitch)
    .getAllByRole('button')
    .filter((button) => button.style.transform)
    .map(translation);
}

const pointKey = (point: { x: number; y: number }) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

const ball = () => screen.getByRole('img', { name: 'Ball' });

describe('FM mode zone and carrier choice', () => {
  it('shows the zone map, the carrier choice and pass control, and fixes the ball', () => {
    fmBoard();
    expect(screen.getByRole('heading', { name: 'Ball zone' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Who has the ball?' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Pass to' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ball' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Ball' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Bench' })).toBeNull();
  });

  it('keeps the ball where the zone put it when it is dragged or nudged', () => {
    const store = fmBoard();
    const before = store.getState();
    fireEvent.pointerDown(ball(), { clientX: 3, clientY: 3 });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 90 });
    fireEvent.pointerUp(window, { clientX: 90, clientY: 90 });
    fireEvent.keyDown(ball(), { key: 'ArrowRight' });
    expect(store.getState().doc).toBe(before.doc);
  });

  it('lists only the roles eligible in the zone and never picks the carrier', async () => {
    const user = userEvent.setup();
    const store = fmBoard();
    await user.click(screen.getByRole('button', { name: 'Right flank - final third' }));
    const picker = screen.getByRole('group', { name: 'Who has the ball?' });
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual(['D(R) - Wing Back', 'AM(R) - Winger']);
    await user.click(screen.getByRole('button', { name: 'Left flank - defensive third' }));
    expect(store.getState().doc.scenario).toBeNull();
    const defensive = screen.getByRole('group', { name: 'Who has the ball?' });
    for (const radio of within(defensive).getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(
      within(defensive)
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual(['D(L) - Wing Back']);
  });

  it('sets the carrier only when the user picks one, and draws the ball above them', async () => {
    const user = userEvent.setup();
    const store = fmBoard();
    await user.click(screen.getByRole('button', { name: 'Left flank - defensive third' }));
    tick(0);
    tick(MOTION_DURATIONS_MS.phase + 1);
    const { ball: spot } = store.getState().doc;
    expect(translation(ball())).toEqual(spot);
    await user.click(screen.getByRole('radio', { name: 'D(L) - Wing Back' }));
    expect(store.getState().doc.scenario).toMatchObject({ carrierId: exampleSlotId('mine', 'DL') });
    tick(0);
    tick(MOTION_DURATIONS_MS.phase + 1);
    const carrierPoint = translation(token('D(L), left side, Wing Back, my team'));
    expect(translation(ball())).toEqual(ballAtopPosition(carrierPoint));
  });

  it('asks to finish the tactic when an assigned role has no runs yet', () => {
    const setUp: Action[] = [
      { type: 'applyFormation', team: 'mine', formationId: '3_4_3_dm_wide' },
      { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
      { type: 'applyMatchup' },
      { type: 'fillDefaultRoles' },
      { type: 'tapZone', zone: 'L-D' },
    ];
    const threeBack = setUp.reduce(
      (current, action) => applyAction(current, action),
      createInitialDocument(),
    );
    const slotId = (slot: string) =>
      threeBack.players.find((p) => p.team === 'mine' && p.slot === slot)!.id;
    const doc = applyAction(threeBack, { type: 'setCarrier', playerId: slotId('WBL') });
    const store = createPitchStore({ doc, ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    expect(screen.queryByText('Finish setting up your tactic to see the runs.')).toBeNull();
    act(() =>
      store
        .getState()
        .dispatch({ type: 'setRole', playerId: slotId('DCL'), roleId: 'wide_centre_back_ip' }),
    );
    expect(screen.getByText('Finish setting up your tactic to see the runs.')).toBeInTheDocument();
  });

  it('says so when nobody in the formation can have the ball in the zone', () => {
    const doc = createExampleDocument();
    const roleless = {
      ...doc,
      scenario: null,
      players: doc.players.map((player) => {
        const { role: _role, ...rest } = player;
        return player.team === 'mine' ? rest : player;
      }),
    };
    const store = createPitchStore({ doc: roleless, ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    const picker = screen.getByRole('group', { name: 'Who has the ball?' });
    expect(within(picker).queryByRole('radio')).toBeNull();
    expect(within(picker).getByRole('status')).toHaveTextContent(
      'No player in this formation can have the ball here. Pick another zone.',
    );
  });
});

describe('FM pass', () => {
  it('moves the ball first and commits the new carrier only when it arrives', async () => {
    const user = userEvent.setup();
    const store = fmBoard();
    const start = store.getState().doc;
    const tacticAtStart = store.getState().tactic;
    const carrierBefore = translation(token('AM(R), right side, Winger, my team'));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pass to' }),
      exampleSlotId('mine', 'DR'),
    );
    await user.click(screen.getByRole('button', { name: 'Pass' }));

    expect(store.getState().ui.action).toEqual({
      type: 'pass',
      receiverId: exampleSlotId('mine', 'DR'),
    });
    expect(store.getState().doc).toBe(start);
    tick(0);
    tick(MOTION_DURATIONS_MS.piece / 2);
    const midBall = translation(ball());
    const receiver = translation(token('D(R), right side, Wing Back, my team'));
    expect(midBall).not.toEqual(ballAtopPosition(carrierBefore));
    expect(midBall).not.toEqual(ballAtopPosition(receiver));
    expect(translation(token('AM(R), right side, Winger, my team'))).toEqual(carrierBefore);
    expect(store.getState().doc).toBe(start);

    tick(MOTION_DURATIONS_MS.piece);
    const after = store.getState();
    expect(after.ui.action).toBeNull();
    expect(after.doc.scenario?.carrierId).toBe(exampleSlotId('mine', 'DR'));
    expect(after.history.past).toEqual([{ tactic: tacticAtStart, mode: 'fm' }]);
  });

  it('then moves the players toward the preferred regions of the new scenario', async () => {
    const user = userEvent.setup();
    const store = fmBoard();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pass to' }),
      exampleSlotId('mine', 'DR'),
    );
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    tick(0);
    tick(MOTION_DURATIONS_MS.piece);
    const targets = [...selectPhasePositions(store.getState().doc).shape.values()].map(pointKey);
    tick(0);
    tick(MOTION_DURATIONS_MS.phase / 2);
    expect(tokenPoints().map(pointKey).sort()).not.toEqual([...targets].sort());
    tick(MOTION_DURATIONS_MS.phase);
    expect(tokenPoints().map(pointKey).sort()).toEqual([...targets].sort());
  });

  it('locks the controls while the ball is travelling', async () => {
    const user = userEvent.setup();
    fmBoard();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pass to' }),
      exampleSlotId('mine', 'DR'),
    );
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    expect(screen.getByRole('combobox', { name: 'Pass to' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Dribble forward' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Left flank - defensive third' }));
    tick(0);
    tick(MOTION_DURATIONS_MS.piece);
    expect(screen.getByRole('combobox', { name: 'Pass to' })).not.toBeDisabled();
  });

  it('finishes within 200 ms under reduced motion', async () => {
    vi.unstubAllGlobals();
    useMotion(true);
    const user = userEvent.setup();
    const store = fmBoard();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pass to' }),
      exampleSlotId('mine', 'DR'),
    );
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    tick(0);
    tick(MOTION_DURATIONS_MS.reduced - 1);
    expect(store.getState().ui.action).not.toBeNull();
    tick(1);
    expect(store.getState().ui.action).toBeNull();
    expect(store.getState().doc.scenario?.carrierId).toBe(exampleSlotId('mine', 'DR'));
  });
});

describe('FM dribble', () => {
  it('moves the carrier and the ball together, then recomputes the scenario', async () => {
    const user = userEvent.setup();
    const store = fmBoard();
    const start = store.getState().doc;
    const tacticAtStart = store.getState().tactic;
    const carrierName = 'AM(R), right side, Winger, my team';
    const carrierBefore = translation(token(carrierName));
    const strikerBefore = translation(token('ST, Deep-Lying Forward, my team'));
    await user.click(screen.getByRole('button', { name: 'Dribble forward' }));
    expect(store.getState().ui.action).toEqual({ type: 'dribble', direction: 'forward' });
    expect(store.getState().doc).toBe(start);

    tick(0);
    tick(MOTION_DURATIONS_MS.piece / 2);
    const carrierMid = translation(token(carrierName));
    const ballMid = translation(ball());
    expect(carrierMid.y).toBeLessThan(carrierBefore.y);
    expect(carrierMid.y).toBeGreaterThan(carrierBefore.y - DRIBBLE_STEP);
    expect(ballMid).toEqual(ballAtopPosition(carrierMid));
    expect(translation(token('ST, Deep-Lying Forward, my team'))).toEqual(strikerBefore);
    expect(store.getState().doc).toBe(start);

    tick(MOTION_DURATIONS_MS.piece);
    const after = store.getState();
    expect(after.ui.action).toBeNull();
    expect(after.doc.ball.y).toBeLessThan(start.ball.y);
    expect(after.doc.scenario?.carrierId).toBe(EXAMPLE_CARRIER);
    expect(after.history.past).toEqual([{ tactic: tacticAtStart, mode: 'fm' }]);
  });
});
