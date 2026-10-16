import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import type { Point } from '../../../data/types';
import {
  ballAtopPosition,
  computePhases,
  MOTION_DURATIONS_MS,
  PHASES,
  zoneOf,
  type Phase,
} from '../../../engine';
import { activeRoleOf, phasePlayersOf } from '../../../state/context';
import {
  BALL_START,
  playerSide,
  placedPlayers,
  playerLabel,
  possessionOf,
  type PitchDocument,
  type Player,
} from '../../../state/document';
import { createExampleDocument } from '../../../state/example';
import {
  selectCanUndo,
  selectDisplayPositions,
  selectPhasePositions,
} from '../../../state/selectors';
import type { ArrowMode, PitchStore } from '../../../state/store';
import { UndoControl } from '../../chrome/UndoControl';
import {
  ARROWS_ALL_LABEL,
  ARROWS_LABEL,
  ARROWS_SELECTED_LABEL,
  BALL_TOOLTIP,
  CLEAR_LABEL,
  MODE_OPTIONS,
  PITCH_LABEL,
  RESET_DISABLED_REASON,
  RESET_LABEL,
  SIDE_COLUMN_LABEL,
  SETUP_COLUMN_LABEL,
  THEME_DARK_LABEL,
  THEME_LIGHT_LABEL,
  TOKEN_TOOLTIP,
} from '../../copy';
import { FirstRunHint } from '../../feedback/FirstRunHint';
import { SetupFlow } from '../../setup/SetupFlow';
import { MatchupStep } from '../../setup/MatchupStep';
import { roleOptions } from '../../setup/setup-model';
import { Button } from '../../controls/Button';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { Bench } from '../../bench/Bench';
import { useBelowBreakpoint } from '../../../shared/hooks/useBelowBreakpoint';
import { usePieceMotion } from '../../hooks/usePieceMotion';
import { usePitchDrag } from '../../hooks/usePitchDrag';
import { BallCard } from '../../instrument/BallCard';
import { Instrument } from '../../instrument/Instrument';
import { TransportBar } from '../../instrument/TransportBar';
import { ZoneMap } from '../../instrument/ZoneMap';
import { Arrow } from '../../pitch/Arrow';
import { Ball } from '../../pitch/Ball';
import { ballKeyStep } from '../../pitch/Ball/ball-keys';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import { RolePicker, type RolePickerRole } from '../../roles/RolePicker';
import { PICKER_SIZE, anchorRolePicker } from './anchor-role-picker';
import { useBoardMetrics } from '../use-board-metrics';
import styles from './board-desktop.module.scss';

const BALL_DRAG_ID = 'ball';
const PHASE_INDEX: Record<Phase, 0 | 1 | 2> = { shape: 0, runs: 1, final: 2 };
const ARROW_OPTIONS = [
  { value: 'all', label: ARROWS_ALL_LABEL },
  { value: 'selected', label: ARROWS_SELECTED_LABEL },
];
const TOP_BAR_COMPACT_MAX_WIDTH = 1439;
const DESKTOP_HIT_PX = 40;

export interface BoardDesktopProps {
  store: StoreApi<PitchStore>;
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function roleLabel(doc: PitchDocument, player: Player) {
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  return FM26_DATA.roles.find((role) => role.id === roleId)?.name;
}

function roleMovement(doc: PitchDocument, playerId: string, roleId: string) {
  const positions = computePhases({
    attacker: doc.attacker,
    players: phasePlayersOf(doc, FM26_DATA).map((player) =>
      player.id === playerId ? { ...player, roleId } : player,
    ),
    ball: doc.ball,
    carrierId: doc.scenario?.carrierId ?? null,
    tables: {
      movement: FM26_DATA.movement,
      shapeLineShift: FM26_DATA.shapeLineShift,
      lineShift: FM26_DATA.lineShift,
    },
  }).positions;
  const from = positions.shape.get(playerId) ?? { x: 0, y: 0 };
  return { from, to: positions.final.get(playerId) ?? from };
}

function pickerRoles(doc: PitchDocument, player: Player): RolePickerRole[] {
  return roleOptions(doc, player).map((role) => ({
    id: role.id,
    name: role.name,
    desc: role.description,
    ...roleMovement(doc, player.id, role.id),
  }));
}

function movementArrows(doc: PitchDocument, arrows: ArrowMode, selectedPlayerId: string | null) {
  const phases = selectPhasePositions(doc);
  const carrierId = doc.scenario?.carrierId;
  return placedPlayers(doc).flatMap((player) => {
    if (player.id === carrierId) return [];
    if (arrows === 'selected' && player.id !== selectedPlayerId) return [];
    const from = phases.shape.get(player.id);
    const to = phases.final.get(player.id);
    if (!from || !to || samePoint(from, to)) return [];
    return [{ id: player.id, team: player.team, from, to }];
  });
}

export function BoardDesktop({ store }: BoardDesktopProps) {
  const doc = useStore(store, (state) => state.doc);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const positions = useStore(store, selectDisplayPositions);
  const metrics = useBoardMetrics();
  const compactBar = useBelowBreakpoint(TOP_BAR_COMPACT_MAX_WIDTH);
  const canReset = doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null;
  const fm = ui.mode === 'fm';
  const carrier = doc.players.find((player) => player.id === doc.scenario?.carrierId);
  const carrierPoint = carrier ? positions.get(carrier.id) : undefined;
  const ballTarget =
    ui.drag?.target.kind === 'ball'
      ? ui.drag.point
      : carrier && carrier.team === doc.attacker && carrierPoint
        ? ballAtopPosition(carrierPoint)
        : doc.ball;
  const { x: ballX, y: ballY } = ballTarget;
  const ballTargets = useMemo(
    () => new Map([[BALL_DRAG_ID, { x: ballX, y: ballY }]]),
    [ballX, ballY],
  );
  const ballPoint =
    usePieceMotion({
      targets: ballTargets,
      draggingId: ui.drag?.target.kind === 'ball' ? BALL_DRAG_ID : null,
    }).get(BALL_DRAG_ID) ?? ballTarget;

  const [showHint, setShowHint] = useState(
    () => JSON.stringify(store.getState().doc) === JSON.stringify(createExampleDocument()),
  );
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [ballFocused, setBallFocused] = useState(false);
  const [pickerPlace, setPickerPlace] = useState({ left: 0, top: 0 });
  const openToken = useRef<SVGGElement | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: string; moved: boolean } | null>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
  }, [ui.theme]);

  useEffect(() => {
    if (!ui.playing) return;
    const index = PHASE_INDEX[ui.phase];
    const timer = window.setTimeout(() => {
      const phase = PHASES[index + 1];
      if (!phase) return;
      store.getState().patchUi({ phase, playing: phase !== 'final' });
    }, MOTION_DURATIONS_MS.cadence);
    return () => window.clearTimeout(timer);
  }, [store, ui.phase, ui.playing]);

  useEffect(() => {
    if (!fm) setPickedId(null);
  }, [fm]);

  const unmovedTap = () => {
    const tap = gesture.current && !gesture.current.moved ? gesture.current.id : null;
    gesture.current = null;
    return tap;
  };

  const drag = usePitchDrag({
    onDragStart: (id) => {
      if (gesture.current?.id !== id) gesture.current = { id, moved: false };
      const state = store.getState();
      if (id === BALL_DRAG_ID) {
        state.beginDrag({ kind: 'ball' }, state.doc.ball);
        return;
      }
      const point = selectDisplayPositions(state).get(id);
      if (point) state.beginDrag({ kind: 'player', id }, point);
    },
    onDragMove: (_id, point) => {
      if (gesture.current) gesture.current.moved = true;
      store.getState().updateDrag(point);
    },
    onDragEnd: (_id, point) => {
      const tap = unmovedTap();
      const state = store.getState();
      if (tap) {
        state.cancelDrag();
        if (tap !== BALL_DRAG_ID && state.ui.mode === 'fm') setPickedId(tap);
        return;
      }
      state.updateDrag(point);
      state.endDrag();
    },
    onCancel: () => {
      const tap = unmovedTap();
      const state = store.getState();
      state.cancelDrag();
      if (tap && tap !== BALL_DRAG_ID && state.ui.mode === 'fm') setPickedId(tap);
    },
  });

  const picked = fm && pickedId ? doc.players.find((player) => player.id === pickedId) : undefined;
  const pickedRoleId = picked ? activeRoleOf(doc, picked, FM26_DATA) : undefined;
  const pickedRoles = picked && picked.slot && pickedRoleId ? pickerRoles(doc, picked) : [];

  useLayoutEffect(() => {
    const token = openToken.current;
    const node = pickerRef.current;
    if (!picked || !token || !node) return;
    const rect = token.getBoundingClientRect();
    const measured = { width: node.offsetWidth, height: node.offsetHeight };
    const size = measured.width > 0 && measured.height > 0 ? measured : PICKER_SIZE;
    setPickerPlace(
      anchorRolePicker(
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
        size,
      ),
    );
  }, [picked, doc, ui.phase]);

  useEffect(() => {
    if (!picked) return;
    const token = openToken.current;
    const close = (focusToken: boolean) => {
      setPickedId(null);
      if (focusToken) token?.focus();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      if (token?.contains(target)) return;
      const onPitchToken =
        target instanceof Element &&
        drag.svgRef.current?.contains(target) &&
        target.closest('[role="button"]');
      close(!onPitchToken);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [picked, drag.svgRef]);

  const pieceScale = { ppu: metrics.ppu, tokenPx: metrics.tokenPx, hitPx: DESKTOP_HIT_PX };
  const ballZone = zoneOf(doc.ball, doc.attacker);
  const ballAtCentre = samePoint(doc.ball, BALL_START);
  const onBallKey = (event: ReactKeyboardEvent<SVGGElement>) => {
    const next = ballKeyStep(doc.ball, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    store.getState().dispatch({ type: 'dragBall', point: next });
  };
  const boardStyle = {
    '--gp-pitch-w': `${metrics.pitchW}px`,
    '--gp-pitch-h': `${metrics.pitchH}px`,
  } as CSSProperties;

  return (
    <div
      className={styles.board}
      data-layout={metrics.layout}
      data-labels={metrics.labels}
      style={boardStyle}
    >
      <header className={styles.top} data-compact={compactBar || undefined}>
        <SegmentedControl
          label="Mode"
          value={fm ? 'fm' : 'open'}
          options={MODE_OPTIONS}
          onChange={(value) => store.getState().setMode(value === 'fm' ? 'fm' : 'openPitch')}
        />
        <UndoControl canUndo={canUndo} redo={false} onUndo={() => store.getState().undo()} />
        <span className={styles.spacer} />
        {compactBar ? (
          <Button
            variant="icon"
            icon="reset"
            label={RESET_LABEL}
            disabled={!canReset}
            disabledReason={canReset ? undefined : RESET_DISABLED_REASON}
            onClick={() => store.getState().dispatch({ type: 'reset' })}
          />
        ) : (
          <Button
            variant="ghost"
            icon="reset"
            disabled={!canReset}
            disabledReason={canReset ? undefined : RESET_DISABLED_REASON}
            onClick={() => store.getState().dispatch({ type: 'reset' })}
          >
            {RESET_LABEL}
          </Button>
        )}
        {compactBar ? (
          <Button
            variant="icon"
            icon="clear"
            label={CLEAR_LABEL}
            onClick={() => store.getState().dispatch({ type: 'clearScenario' })}
          />
        ) : (
          <Button
            variant="ghost"
            icon="clear"
            onClick={() => store.getState().dispatch({ type: 'clearScenario' })}
          >
            {CLEAR_LABEL}
          </Button>
        )}
        <Button
          variant="icon"
          icon={ui.theme === 'dark' ? 'sun' : 'moon'}
          label={ui.theme === 'dark' ? THEME_LIGHT_LABEL : THEME_DARK_LABEL}
          onClick={() =>
            store.getState().patchUi({ theme: ui.theme === 'dark' ? 'light' : 'dark' })
          }
        />
      </header>
      <div className={styles.main}>
        <section className={styles.setup} data-column="setup" aria-label={SETUP_COLUMN_LABEL}>
          {fm ? (
            <>
              <SetupFlow store={store} />
              <SegmentedControl
                label={ARROWS_LABEL}
                showLabel
                value={ui.arrows}
                options={ARROW_OPTIONS}
                onChange={(value) => {
                  if (value === 'all' || value === 'selected') {
                    store.getState().patchUi({ arrows: value });
                  }
                }}
              />
            </>
          ) : (
            <MatchupStep store={store} />
          )}
        </section>
        <div className={styles.pitch} data-column="pitch">
          {showHint ? <FirstRunHint onDismiss={() => setShowHint(false)} /> : null}
          <PitchFrame
            inset
            attacking={doc.attacker}
            mine={doc.teams.mine.name}
            opponent={doc.teams.opponent.name}
          >
            <Pitch label={PITCH_LABEL} svgRef={drag.svgRef}>
              {movementArrows(doc, ui.arrows, ui.selectedPlayerId).map((arrow) => (
                <Arrow
                  key={arrow.id}
                  from={arrow.from}
                  to={arrow.to}
                  team={arrow.team}
                  scale={pieceScale}
                />
              ))}
              {placedPlayers(doc).map((player) => {
                const point = positions.get(player.id);
                if (!point) return null;
                const dragging =
                  ui.drag?.target.kind === 'player' && ui.drag.target.id === player.id;
                const role = fm ? roleLabel(doc, player) : undefined;
                const selected = picked?.id === player.id;
                return (
                  <PlayerToken
                    key={player.id}
                    x={point.x}
                    y={point.y}
                    scale={pieceScale}
                    team={player.team}
                    keeper={player.isKeeper}
                    label={playerLabel(player)}
                    side={playerSide(player)}
                    role={role}
                    showRole={Boolean(role) && (metrics.labels === 'full' || selected)}
                    selected={selected}
                    title={role ? TOKEN_TOOLTIP(playerLabel(player), role) : undefined}
                    dragging={dragging}
                    onPointerDown={(event) => {
                      openToken.current = event.currentTarget;
                      gesture.current = { id: player.id, moved: false };
                      drag.startDrag(player.id)(event);
                    }}
                  />
                );
              })}
              <Ball
                x={ballPoint.x}
                y={ballPoint.y}
                scale={pieceScale}
                title={BALL_TOOLTIP}
                selected={ballFocused}
                dragging={ui.drag?.target.kind === 'ball'}
                onPointerDown={drag.startDrag(BALL_DRAG_ID)}
                onFocus={() => setBallFocused(true)}
                onBlur={() => setBallFocused(false)}
                onKeyDown={onBallKey}
              />
            </Pitch>
          </PitchFrame>
        </div>
        <section
          className={styles.instrument}
          data-column="instrument"
          aria-label={SIDE_COLUMN_LABEL}
        >
          {fm ? (
            <Instrument>
              <ZoneMap
                value={doc.scenario?.zone ?? null}
                carrier={carrier ? playerLabel(carrier) : undefined}
                attackerName={doc.teams[doc.attacker].name}
                onPick={(zone) => store.getState().dispatch({ type: 'tapZone', zone })}
              />
              <div className={styles.transport}>
                <TransportBar
                  phase={PHASE_INDEX[ui.phase]}
                  playing={ui.playing}
                  onPhase={(index) => {
                    const phase = PHASES[index];
                    if (!phase) return;
                    store.getState().patchUi({ phase, playing: false });
                  }}
                  onTogglePlay={() => {
                    const state = store.getState();
                    if (state.ui.playing) {
                      state.patchUi({ playing: false });
                      return;
                    }
                    state.patchUi({
                      playing: true,
                      phase: state.ui.phase === 'final' ? 'shape' : state.ui.phase,
                    });
                  }}
                />
              </div>
            </Instrument>
          ) : (
            <>
              <BallCard
                zone={ballZone}
                atCentre={ballAtCentre}
                onCentre={() => store.getState().dispatch({ type: 'dragBall', point: BALL_START })}
              />
              <Bench
                pieces={doc.players.flatMap((player) =>
                  player.base
                    ? []
                    : [
                        {
                          id: player.id,
                          label: playerLabel(player),
                          team: player.team,
                          keeper: player.isKeeper,
                          name: player.customName,
                        },
                      ],
                )}
                placed={placedPlayers(doc).length}
              />
            </>
          )}
        </section>
      </div>
      {picked && picked.slot && pickedRoleId ? (
        <div
          ref={pickerRef}
          className={styles.picker}
          style={{ left: pickerPlace.left, top: pickerPlace.top }}
        >
          <RolePicker
            slotLabel={playerLabel(picked)}
            side={playerSide(picked)}
            phase={possessionOf(doc, picked.team) === 'in' ? 'IP' : 'OOP'}
            team={picked.team}
            roles={pickedRoles}
            current={pickedRoleId}
            value={pickedRoleId}
            zone={doc.scenario?.zone}
            onChoose={(roleId) =>
              store.getState().dispatch({ type: 'setRole', playerId: picked.id, roleId })
            }
            onClose={() => setPickedId(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
