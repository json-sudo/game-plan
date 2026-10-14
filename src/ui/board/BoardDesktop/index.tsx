import { useEffect, useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import type { Point } from '../../../data/types';
import { ballAtopPosition, type Phase } from '../../../engine';
import { activeRoleOf } from '../../../state/context';
import {
  placedPlayers,
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
  CLEAR_LABEL,
  MODE_OPTIONS,
  PITCH_LABEL,
  RESET_DISABLED_REASON,
  RESET_LABEL,
  SETUP_ROLES,
  SETUP_ROLES_HINT,
  SETUP_STEP_FORMATIONS,
  SETUP_STEP_WHO_ATTACKS,
  THEME_DARK_LABEL,
  THEME_LIGHT_LABEL,
  SIDE_COLUMN_LABEL,
  SETUP_COLUMN_LABEL,
  TOKEN_TEAM_LABELS,
  VERSUS_LABEL,
  setupAttacksSummary,
  setupRoleChoiceLabel,
  setupRolesSummary,
} from '../../copy';
import { FirstRunHint } from '../../feedback/FirstRunHint';
import { ChoiceGrid } from '../../setup/ChoiceGrid';
import { SetupStepper, type SetupStep, type StepState } from '../../setup/SetupStepper';
import { Button } from '../../controls/Button';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { Bench } from '../../bench/Bench';
import { usePitchDrag } from '../../hooks/usePitchDrag';
import { Instrument } from '../../instrument/Instrument';
import { TransportBar } from '../../instrument/TransportBar';
import { ZoneMap } from '../../instrument/ZoneMap';
import { Arrow } from '../../pitch/Arrow';
import { Ball } from '../../pitch/Ball';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import styles from './board-desktop.module.scss';

const BALL_DRAG_ID = 'ball';
const COLUMN_STYLE = { width: '300px', flexBasis: '300px' };
const PHASE_INDEX: Record<Phase, 0 | 1 | 2> = { shape: 0, runs: 1, final: 2 };
const ARROW_OPTIONS = [
  { value: 'all', label: ARROWS_ALL_LABEL },
  { value: 'selected', label: ARROWS_SELECTED_LABEL },
];

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

function formationLabel(id: string | null) {
  if (!id) return null;
  return FM26_DATA.formations.find((formation) => formation.id === id)?.name ?? null;
}

function formationSummary(doc: PitchDocument) {
  const mine = formationLabel(doc.teams.mine.formationId);
  const opponent = formationLabel(doc.teams.opponent.formationId);
  if (!mine || !opponent) return undefined;
  return `${mine} ${VERSUS_LABEL} ${opponent}`;
}

function setupComplete(doc: PitchDocument) {
  const placed = placedPlayers(doc);
  return (
    doc.teams.mine.formationId !== null &&
    doc.teams.opponent.formationId !== null &&
    placed.length > 0 &&
    placed.every((player) => player.role !== undefined)
  );
}

function stepMark(
  index: 1 | 2 | 3,
  cursor: 1 | 2 | 3 | null,
  complete: boolean,
): { state: StepState; reopened: boolean } {
  if (cursor === null) return { state: 'done', reopened: false };
  if (complete) {
    return index === cursor
      ? { state: 'active', reopened: true }
      : { state: 'done', reopened: false };
  }
  if (index < cursor) return { state: 'done', reopened: false };
  if (index === cursor) return { state: 'active', reopened: false };
  return { state: 'todo', reopened: false };
}

function roleOptions(doc: PitchDocument, player: Player) {
  if (!player.family) return [];
  const family = player.family;
  const possession = possessionOf(doc, player.team);
  return FM26_DATA.roles.filter(
    (role) => role.possession === possession && role.families.includes(family),
  );
}

const FORMATION_OPTIONS = FM26_DATA.formations.map((formation) => ({
  label: formation.name,
  value: formation.id,
}));

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
  const canReset = doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null;
  const fm = ui.mode === 'fm';
  const carrier = doc.players.find((player) => player.id === doc.scenario?.carrierId);
  const carrierPoint = carrier ? positions.get(carrier.id) : undefined;
  const ballPoint =
    ui.drag?.target.kind === 'ball'
      ? ui.drag.point
      : carrier && carrier.team === doc.attacker && carrierPoint
        ? ballAtopPosition(carrierPoint)
        : doc.ball;
  const mineFormation = formationLabel(doc.teams.mine.formationId);
  const opponentFormation = formationLabel(doc.teams.opponent.formationId);
  const complete = setupComplete(doc);
  const cursor = ui.setupStep ?? (complete ? null : 1);
  const [showHint, setShowHint] = useState(
    () => JSON.stringify(store.getState().doc) === JSON.stringify(createExampleDocument()),
  );
  const marks = ([1, 2, 3] as const).map((index) => stepMark(index, cursor, complete));
  const placed = placedPlayers(doc);
  const steps: SetupStep[] = [
    {
      title: SETUP_STEP_FORMATIONS,
      state: marks[0].state,
      reopened: marks[0].reopened,
      summary: formationSummary(doc),
      content: (
        <>
          <ChoiceGrid
            label={doc.teams.mine.name}
            mark="mine"
            options={FORMATION_OPTIONS}
            value={doc.teams.mine.formationId ?? undefined}
            onChange={(formationId) =>
              store.getState().dispatch({ type: 'applyFormation', team: 'mine', formationId })
            }
          />
          <ChoiceGrid
            label={doc.teams.opponent.name}
            mark="opp"
            options={FORMATION_OPTIONS}
            value={doc.teams.opponent.formationId ?? undefined}
            onChange={(formationId) =>
              store.getState().dispatch({ type: 'applyFormation', team: 'opponent', formationId })
            }
          />
        </>
      ),
    },
    {
      title: SETUP_STEP_WHO_ATTACKS,
      state: marks[1].state,
      reopened: marks[1].reopened,
      summary: setupAttacksSummary(doc.teams[doc.attacker].name),
      content: (
        <SegmentedControl
          label={SETUP_STEP_WHO_ATTACKS}
          value={doc.attacker}
          options={[
            { value: 'mine', label: doc.teams.mine.name },
            { value: 'opponent', label: doc.teams.opponent.name },
          ]}
          onChange={(value) => {
            if (value === 'mine' || value === 'opponent') {
              store.getState().dispatch({ type: 'setAttacker', attacker: value });
            }
          }}
        />
      ),
    },
    {
      title: SETUP_ROLES,
      state: marks[2].state,
      reopened: marks[2].reopened,
      summary: complete ? setupRolesSummary(placed.length) : undefined,
      content: (
        <>
          <p className={styles['roles-hint']}>{SETUP_ROLES_HINT}</p>
          {placed.map((player) => {
            const options = roleOptions(doc, player);
            if (!player.slot || options.length === 0) return null;
            return (
              <label key={player.id} className={styles['role-choice']}>
                <span>{player.slot}</span>
                <select
                  aria-label={setupRoleChoiceLabel(player.slot, TOKEN_TEAM_LABELS[player.team])}
                  value={player.role ?? ''}
                  onChange={(event) =>
                    store.getState().dispatch({
                      type: 'setRole',
                      playerId: player.id,
                      roleId: event.target.value,
                    })
                  }
                >
                  {options.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </>
      ),
    },
  ];

  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
  }, [ui.theme]);

  const drag = usePitchDrag({
    onDragStart: (id) => {
      const state = store.getState();
      if (id === BALL_DRAG_ID) {
        state.beginDrag({ kind: 'ball' }, state.doc.ball);
        return;
      }
      const point = selectDisplayPositions(state).get(id);
      if (point) state.beginDrag({ kind: 'player', id }, point);
    },
    onDragMove: (_id, point) => store.getState().updateDrag(point),
    onDragEnd: (_id, point) => {
      const state = store.getState();
      state.updateDrag(point);
      state.endDrag();
    },
    onCancel: () => store.getState().cancelDrag(),
  });

  return (
    <div className={styles.board}>
      <header className={styles.top}>
        <SegmentedControl
          label="Mode"
          value={fm ? 'fm' : 'open'}
          options={MODE_OPTIONS}
          onChange={(value) => store.getState().setMode(value === 'fm' ? 'fm' : 'openPitch')}
        />
        <UndoControl canUndo={canUndo} redo={false} onUndo={() => store.getState().undo()} />
        <Button
          variant="ghost"
          disabled={!canReset}
          disabledReason={canReset ? undefined : RESET_DISABLED_REASON}
          onClick={() => store.getState().dispatch({ type: 'reset' })}
        >
          {RESET_LABEL}
        </Button>
        <Button
          variant="ghost"
          icon="clear"
          onClick={() => store.getState().dispatch({ type: 'clearScenario' })}
        >
          {CLEAR_LABEL}
        </Button>
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
        <section
          className={styles.column}
          data-column="setup"
          aria-label={SETUP_COLUMN_LABEL}
          style={COLUMN_STYLE}
        >
          <SetupStepper
            steps={steps}
            onBack={(index) => {
              if (index === 1 || index === 2) store.getState().patchUi({ setupStep: index });
            }}
            onNext={(index) => {
              const state = store.getState();
              const finished = setupComplete(state.doc);
              const open = state.ui.setupStep ?? (finished ? null : 1);
              if ((finished && open !== null) || index === 2) {
                state.patchUi({ setupStep: null });
                return;
              }
              if (index === 1) {
                state.dispatch({ type: 'fillDefaultRoles' });
                state.patchUi({ setupStep: 3 });
                return;
              }
              state.patchUi({ setupStep: 2 });
            }}
            onEdit={(index) => {
              const step = index + 1;
              if (step === 1 || step === 2 || step === 3) {
                store.getState().patchUi({ setupStep: step });
              }
            }}
          />
          {mineFormation && opponentFormation ? (
            <p className={styles.matchup}>
              <span>{mineFormation}</span> {VERSUS_LABEL} <span>{opponentFormation}</span>
            </p>
          ) : null}
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
        </section>
        <div className={styles.pitch} data-column="pitch">
          {showHint ? <FirstRunHint onDismiss={() => setShowHint(false)} /> : null}
          <PitchFrame
            attacking={doc.attacker}
            mine={doc.teams.mine.name}
            opponent={doc.teams.opponent.name}
          >
            <Pitch label={PITCH_LABEL} svgRef={drag.svgRef}>
              {movementArrows(doc, ui.arrows, ui.selectedPlayerId).map((arrow) => (
                <Arrow key={arrow.id} from={arrow.from} to={arrow.to} team={arrow.team} />
              ))}
              {placedPlayers(doc).map((player) => {
                const point = positions.get(player.id);
                if (!point) return null;
                const dragging =
                  ui.drag?.target.kind === 'player' && ui.drag.target.id === player.id;
                const role = fm ? roleLabel(doc, player) : undefined;
                return (
                  <PlayerToken
                    key={player.id}
                    x={point.x}
                    y={point.y}
                    team={player.team}
                    keeper={player.isKeeper}
                    label={player.slot ?? ''}
                    role={role}
                    showRole={fm}
                    dragging={dragging}
                    onPointerDown={drag.startDrag(player.id)}
                  />
                );
              })}
              <g onPointerDown={drag.startDrag(BALL_DRAG_ID)}>
                <Ball x={ballPoint.x} y={ballPoint.y} />
              </g>
            </Pitch>
          </PitchFrame>
        </div>
        <section
          className={styles.column}
          data-column="instrument"
          aria-label={SIDE_COLUMN_LABEL}
          style={COLUMN_STYLE}
        >
          <Instrument>
            <ZoneMap
              value={doc.scenario?.zone ?? null}
              carrier={carrier?.slot ?? undefined}
              attackerName={doc.teams[doc.attacker].name}
            />
            {fm ? <TransportBar phase={PHASE_INDEX[ui.phase]} playing={ui.playing} /> : null}
          </Instrument>
          {fm ? null : (
            <Bench
              pieces={doc.players.flatMap((player) =>
                player.base
                  ? []
                  : [
                      {
                        id: player.id,
                        label: player.slot ?? player.id,
                        team: player.team,
                        keeper: player.isKeeper,
                        name: player.customName,
                      },
                    ],
              )}
              placed={placedPlayers(doc).length}
            />
          )}
        </section>
      </div>
    </div>
  );
}
