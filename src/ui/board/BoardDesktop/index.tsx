import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import type { Point } from '../../../data/types';
import { zoneOf } from '../../../engine';
import { benchPieces, pieceLabel } from '../../../state/bench-pieces';
import { activeRoleOf } from '../../../state/context';
import {
  BALL_START,
  SIDES,
  SQUAD_SIZES,
  playerSide,
  placedPlayers,
  formationOf,
  isSetupComplete,
  type PitchDocument,
  type Player,
} from '../../../state/document';
import { benchPlacementPoint } from '../../../state/placement';
import { canSetSquadSize } from '../../../state/tactic-actions';
import { selectCanUndo, selectFmVisualization } from '../../../state/selectors';
import type { PitchStore } from '../../../state/store';
import { TopBar } from '../../chrome/TopBar';
import {
  BALL_TOOLTIP,
  CLEAR_FM_REASON,
  PITCH_LABEL,
  SIDE_COLUMN_LABEL,
  SETUP_COLUMN_LABEL,
  TOKEN_TOOLTIP,
} from '../../copy';
import { useShareExport } from '../use-share-export';
import { SetupFlow } from '../../setup/SetupFlow';
import { MatchupStep } from '../../setup/MatchupStep';
import { setupCursor } from '../../setup/setup-model';
import { Bench } from '../../bench/Bench';
import { SquadControls, type SquadControlTeam } from '../../bench/SquadControls';
import { useBelowBreakpoint } from '../../../shared/hooks/useBelowBreakpoint';
import { BALL_PIECE_ID } from '../../hooks/usePitchMotion';
import { BallCard } from '../../instrument/BallCard';
import { Instrument } from '../../instrument/Instrument';
import { SequenceControls } from '../../instrument/SequenceControls';
import { ZoneMap } from '../../instrument/ZoneMap';
import { Ball } from '../../pitch/Ball';
import { pieceKeyStep } from '../../pitch/piece-keys';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import { tokenKeyCommand } from '../token-keys';
import { useBoardDrag } from '../use-board-drag';
import { useBoardMetrics } from '../use-board-metrics';
import { fmPitchNotice, opponentOnPitch, resetState, visualizationControls } from '../fm-pieces';
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

export function BoardDesktop({ store }: BoardDesktopProps) {
  const doc = useStore(store, (state) => state.doc);
  const tactic = useStore(store, (state) => state.tactic);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const viz = useStore(store, selectFmVisualization);
  const view = useBoardPieces(store);
  const metrics = useBoardMetrics();
  const compactBar = useBelowBreakpoint(TOP_BAR_COMPACT_MAX_WIDTH);
  const fm = ui.mode === 'fm';
  const reset = resetState(doc, fm);
  const shareExport = useShareExport(store);
  const ballZone = zoneOf(doc.ball, doc.attacker);
  const hasAttackerFormation = formationOf(FM26_DATA, doc.teams[doc.attacker].formationId) !== null;

  const [ballFocused, setBallFocused] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
  }, [ui.theme]);

  const drag = useBoardDrag(store);

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
    if (!command || command.kind === 'select') return;
    event.preventDefault();
    if (command.kind === 'move') {
      store.getState().dispatch({ type: 'movePlayer', playerId: player.id, point: command.point });
    } else {
      store.getState().dispatch({ type: 'benchPlayer', playerId: player.id });
    }
  };
  const draggedPlayerId = ui.drag?.target.kind === 'player' ? ui.drag.target.id : null;
  const draggedFromPitch = doc.players.some(
    (player) => player.id === draggedPlayerId && player.base !== undefined,
  );
  const piecesOnPitch = view.doc.players.filter((player) =>
    fm ? view.pieces.has(player.id) : player.base !== undefined || player.id === draggedPlayerId,
  );
  const cursor = setupCursor(doc, ui.setupStep);
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
      <TopBar
        mine={doc.teams.mine.name}
        opp={doc.teams.opponent.name}
        mode={fm ? 'fm' : 'open'}
        theme={ui.theme}
        compact={compactBar}
        canUndo={canUndo}
        redo={false}
        canReset={reset.enabled}
        resetReason={reset.reason}
        canClear={!fm}
        clearReason={fm ? CLEAR_FM_REASON : undefined}
        onMineChange={(name) =>
          store.getState().dispatch({ type: 'renameTeam', team: 'mine', name })
        }
        onOppChange={(name) =>
          store.getState().dispatch({ type: 'renameTeam', team: 'opponent', name })
        }
        onModeChange={(value) => store.getState().setMode(value === 'fm' ? 'fm' : 'openPitch')}
        onUndo={() => store.getState().undo()}
        onReset={() => store.getState().dispatch({ type: 'reset' })}
        onClear={() => store.getState().dispatch({ type: 'clearPitch' })}
        onToggleTheme={() =>
          store.getState().patchUi({ theme: ui.theme === 'dark' ? 'light' : 'dark' })
        }
        onExport={() =>
          shareExport.openExport({
            doc: view.doc,
            pieces: view.pieces,
            ball: view.ballVisible ? view.ball : null,
            fm,
            showRole: metrics.labels === 'full',
            tokenPx: metrics.tokenPx,
          })
        }
        onShare={shareExport.share}
      />
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
            solo={fm && !opponentOnPitch(doc)}
            notice={view.ballVisible ? undefined : fmPitchNotice(cursor)}
          >
            <Pitch label={PITCH_LABEL} svgRef={drag.svgRef}>
              {piecesOnPitch.map((player) => {
                const point = view.pieces.get(player.id);
                if (!point) return null;
                const role = fm ? roleLabel(view.doc, player) : undefined;
                const position = pieceLabel(view.doc, player, FM26_DATA);
                const compact = metrics.labels !== 'full';
                return (
                  <PlayerToken
                    key={player.id}
                    x={point.x}
                    y={point.y}
                    scale={pieceScale}
                    team={player.team}
                    keeper={player.isKeeper}
                    label={position}
                    side={playerSide(player)}
                    role={role}
                    showRole={Boolean(role) && !compact}
                    title={role && compact ? TOKEN_TOOLTIP(position, role) : undefined}
                    fixed={fm}
                    dragging={draggedPlayerId === player.id}
                    onPointerDown={drag.startDrag(player.id)}
                    onKeyDown={onTokenKey(player)}
                  />
                );
              })}
              {view.ballVisible ? (
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
              ) : null}
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
                locked={!isSetupComplete(doc)}
                attackerName={doc.teams[doc.attacker].name}
                onPick={(zone) => store.getState().dispatch({ type: 'tapZone', zone })}
              />
              <SequenceControls
                {...visualizationControls(doc, viz)}
                onRestart={() => store.getState().restartVisualization()}
                onAnother={() => store.getState().showAnotherVisualization()}
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
      {shareExport.dialogs}
    </div>
  );
}
