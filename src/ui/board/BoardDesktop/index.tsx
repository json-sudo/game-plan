import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import type { Point } from '../../../data/types';
import { ballAtopPosition, type Phase } from '../../../engine';
import { activeRoleOf } from '../../../state/context';
import { placedPlayers, type PitchDocument, type Player } from '../../../state/document';
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
  MODE_OPTIONS,
  PITCH_LABEL,
  RESET_DISABLED_REASON,
  RESET_LABEL,
  SIDE_COLUMN_LABEL,
  SETUP_COLUMN_LABEL,
  VERSUS_LABEL,
} from '../../copy';
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
      </header>
      <div className={styles.main}>
        <section
          className={styles.column}
          data-column="setup"
          aria-label={SETUP_COLUMN_LABEL}
          style={COLUMN_STYLE}
        >
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
