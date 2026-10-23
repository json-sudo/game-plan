import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import type { Point } from '../../../data/types';
import { targetFor, zoneOf } from '../../../engine';
import { benchPieces, pieceLabel } from '../../../state/bench-pieces';
import { activeRoleOf } from '../../../state/context';
import {
  BALL_START,
  SIDES,
  SQUAD_SIZES,
  playerSide,
  placedPlayers,
  possessionOf,
  formationOf,
  type PitchDocument,
  type Player,
} from '../../../state/document';
import { benchPlacementPoint } from '../../../state/placement';
import { canSetSquadSize } from '../../../state/tactic-actions';
import { selectCanUndo } from '../../../state/selectors';
import type { PitchStore } from '../../../state/store';
import { UndoControl } from '../../chrome/UndoControl';
import {
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
import { SetupFlow } from '../../setup/SetupFlow';
import { MatchupStep } from '../../setup/MatchupStep';
import { roleOptions } from '../../setup/setup-model';
import { Button } from '../../controls/Button';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { Bench } from '../../bench/Bench';
import { SquadControls, type SquadControlTeam } from '../../bench/SquadControls';
import { useBelowBreakpoint } from '../../../shared/hooks/useBelowBreakpoint';
import { BALL_PIECE_ID } from '../../hooks/usePitchMotion';
import { BallCard } from '../../instrument/BallCard';
import { Instrument } from '../../instrument/Instrument';
import { ZoneMap } from '../../instrument/ZoneMap';
import { Ball } from '../../pitch/Ball';
import { pieceKeyStep } from '../../pitch/piece-keys';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import { RolePicker, type RolePickerRole } from '../../roles/RolePicker';
import { PICKER_SIZE, anchorRolePicker } from './anchor-role-picker';
import { tokenKeyCommand } from '../token-keys';
import { useBoardDrag } from '../use-board-drag';
import { useBoardMetrics } from '../use-board-metrics';
import { useBoardPieces } from '../use-board-pieces';
import styles from './board-desktop.module.scss';

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

function roleMovement(doc: PitchDocument, player: Player, roleId: string) {
  const from = player.base ?? { x: 0, y: 0 };
  if (!doc.scenario || !player.base) return { from, to: from };
  const result = targetFor({
    base: player.base,
    start: player.base,
    team: player.team,
    attacker: doc.attacker,
    roleId,
    isKeeper: player.isKeeper,
    zone: doc.scenario.zone,
    tables: {
      movement: FM26_DATA.movement,
      shapeLineShift: FM26_DATA.shapeLineShift,
      lineShift: FM26_DATA.lineShift,
    },
  });
  return { from, to: result.status === 'ok' ? result.target : from };
}

function pickerRoles(doc: PitchDocument, player: Player): RolePickerRole[] {
  return roleOptions(doc, player).map((role) => ({
    id: role.id,
    name: role.name,
    desc: role.description,
    ...roleMovement(doc, player, role.id),
  }));
}

export function BoardDesktop({ store }: BoardDesktopProps) {
  const doc = useStore(store, (state) => state.doc);
  const tactic = useStore(store, (state) => state.tactic);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const view = useBoardPieces(store);
  const metrics = useBoardMetrics();
  const compactBar = useBelowBreakpoint(TOP_BAR_COMPACT_MAX_WIDTH);
  const canReset = doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null;
  const fm = ui.mode === 'fm';
  const ballZone = zoneOf(doc.ball, doc.attacker);
  const hasAttackerFormation = formationOf(FM26_DATA, doc.teams[doc.attacker].formationId) !== null;

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [ballFocused, setBallFocused] = useState(false);
  const [pickerPlace, setPickerPlace] = useState({ left: 0, top: 0 });
  const openToken = useRef<SVGGElement | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
  }, [ui.theme]);

  useEffect(() => {
    if (!fm) setPickedId(null);
  }, [fm]);

  const drag = useBoardDrag(store, setPickedId);

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
  }, [picked, doc]);

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
  const ballAtCentre = samePoint(doc.ball, BALL_START);
  const onBallKey = (event: ReactKeyboardEvent<SVGGElement>) => {
    const next = pieceKeyStep(doc.ball, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    store.getState().dispatch({ type: 'placeBall', point: next });
  };
  const onTokenKey = (player: Player) => (event: ReactKeyboardEvent<SVGGElement>) => {
    const command = tokenKeyCommand({
      key: event.key,
      shift: event.shiftKey,
      base: player.base,
      mode: ui.mode,
    });
    if (!command) return;
    event.preventDefault();
    if (command.kind === 'select') {
      openToken.current = event.currentTarget;
      setPickedId(player.id);
    } else if (command.kind === 'move') {
      store.getState().dispatch({ type: 'movePlayer', playerId: player.id, point: command.point });
    } else {
      store.getState().dispatch({ type: 'benchPlayer', playerId: player.id });
    }
  };
  const draggedPlayerId = ui.drag?.target.kind === 'player' ? ui.drag.target.id : null;
  const draggedFromPitch = doc.players.some(
    (player) => player.id === draggedPlayerId && player.base !== undefined,
  );
  const piecesOnPitch = doc.players.filter(
    (player) => player.base !== undefined || player.id === draggedPlayerId,
  );
  const squadTeams: SquadControlTeam[] = SIDES.map((team) => ({
    team,
    name: doc.teams[team].name,
    squadSize: doc.teams[team].squadSize,
    keeper: doc.teams[team].keeper,
    blockedSizes: SQUAD_SIZES.filter((size) => !canSetSquadSize(tactic, ui.mode, team, size)),
  }));
  const placeFromBench = (playerId: string) => {
    if (drag.wasDragged()) return;
    const player = doc.players.find((candidate) => candidate.id === playerId);
    if (!player) return;
    store.getState().dispatch({
      type: 'movePlayer',
      playerId,
      point: benchPlacementPoint(doc, player.team),
    });
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
            onClick={() => store.getState().dispatch({ type: 'clearPitch' })}
          />
        ) : (
          <Button
            variant="ghost"
            icon="clear"
            onClick={() => store.getState().dispatch({ type: 'clearPitch' })}
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
          {fm ? <SetupFlow store={store} /> : <MatchupStep store={store} />}
        </section>
        <div className={styles.pitch} data-column="pitch">
          <PitchFrame
            inset
            attacking={doc.attacker}
            mine={doc.teams.mine.name}
            opponent={doc.teams.opponent.name}
          >
            <Pitch label={PITCH_LABEL} svgRef={drag.svgRef}>
              {piecesOnPitch.map((player) => {
                const point = view.pieces.get(player.id);
                if (!point) return null;
                const dragging = draggedPlayerId === player.id;
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
                    label={pieceLabel(doc, player, FM26_DATA)}
                    side={playerSide(player)}
                    role={role}
                    showRole={Boolean(role) && (metrics.labels === 'full' || selected)}
                    selected={selected}
                    title={
                      role ? TOKEN_TOOLTIP(pieceLabel(doc, player, FM26_DATA), role) : undefined
                    }
                    dragging={dragging}
                    onPointerDown={(event) => {
                      openToken.current = event.currentTarget;
                      drag.startDrag(player.id)(event);
                    }}
                    onKeyDown={onTokenKey(player)}
                  />
                );
              })}
              <Ball
                x={view.ball.x}
                y={view.ball.y}
                scale={pieceScale}
                title={fm ? undefined : BALL_TOOLTIP}
                fixed={fm}
                selected={ballFocused}
                dragging={ui.drag?.target.kind === 'ball'}
                onPointerDown={drag.startDrag(BALL_PIECE_ID)}
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
                value={hasAttackerFormation ? ballZone : null}
                attackerName={doc.teams[doc.attacker].name}
                onPick={(zone) => store.getState().dispatch({ type: 'tapZone', zone })}
              />
            </Instrument>
          ) : (
            <>
              <BallCard
                zone={ballZone}
                atCentre={ballAtCentre}
                onCentre={() => store.getState().dispatch({ type: 'placeBall', point: BALL_START })}
              />
              <SquadControls
                teams={squadTeams}
                onSquadSize={(team, size) =>
                  store.getState().dispatch({ type: 'setSquadSize', team, size })
                }
                onKeeper={(team, keeper) =>
                  store.getState().dispatch({ type: 'setKeeper', team, keeper })
                }
              />
              <Bench
                benchRef={drag.benchRef}
                dropping={drag.overBench && draggedFromPitch}
                pieces={benchPieces(doc, FM26_DATA)}
                placed={placedPlayers(doc).length}
                onChipPointerDown={drag.startDrag}
                onPlace={placeFromBench}
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
            slotLabel={pieceLabel(doc, picked, FM26_DATA)}
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
