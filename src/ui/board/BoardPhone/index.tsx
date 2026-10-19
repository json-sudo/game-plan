import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import { MOTION_DURATIONS_MS, PHASES, zoneName, zoneOf, type Phase } from '../../../engine';
import { benchPieces, pieceLabel } from '../../../state/bench-pieces';
import { activeRoleOf } from '../../../state/context';
import {
  BALL_START,
  SIDES,
  SQUAD_SIZES,
  formationOf,
  playerSide,
  placedPlayers,
  type PitchDocument,
  type Player,
} from '../../../state/document';
import { createExampleDocument } from '../../../state/example';
import { canSetSquadSize } from '../../../state/tactic-actions';
import { benchPlacementPoint } from '../../../state/placement';
import { selectCanUndo, selectUnfinishedZones } from '../../../state/selectors';
import type { PitchStore } from '../../../state/store';
import { PhoneMenu, type PhoneMenuEntry } from '../../chrome/PhoneMenu';
import { FirstRunHint } from '../../feedback/FirstRunHint';
import { UndoControl } from '../../chrome/UndoControl';
import { BenchDropZone } from '../../bench/BenchDropZone';
import { BenchSheet } from '../../bench/BenchSheet';
import type { SquadControlTeam } from '../../bench/SquadControls';
import {
  BALL_TOOLTIP,
  BENCH_BUTTON_LABEL,
  CLEAR_LABEL,
  MATCHUP_BUTTON_LABEL,
  MODE_LABELS,
  PITCH_LABEL,
  RESET_DISABLED_REASON,
  RESET_LABEL,
  THEME_DARK_LABEL,
  THEME_LIGHT_LABEL,
} from '../../copy';
import { Button } from '../../controls/Button';
import { BallCard } from '../../instrument/BallCard';
import { CarrierPicker } from '../../instrument/CarrierPicker';
import { Instrument } from '../../instrument/Instrument';
import { PassControl } from '../../instrument/PassControl';
import { TransportBar } from '../../instrument/TransportBar';
import { ZoneMap } from '../../instrument/ZoneMap';
import { SetupFlow } from '../../setup/SetupFlow';
import { MatchupSheet } from '../../setup/MatchupSheet';
import { setupCursor } from '../../setup/setup-model';
import { Ball } from '../../pitch/Ball';
import { pieceKeyStep } from '../../pitch/piece-keys';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import { BALL_PIECE_ID } from '../../hooks/usePitchMotion';
import { carrierOptionsOf } from '../carrier-options';
import { passOptionsOf } from '../pass-options';
import { tokenKeyCommand } from '../token-keys';
import { useBoardDrag } from '../use-board-drag';
import { useBoardMetrics } from '../use-board-metrics';
import { useBoardPieces } from '../use-board-pieces';
import styles from './board-phone.module.scss';

const MODE_ITEM_PREFIX = 'Mode: ';
const MENU_LABEL = 'Menu';
const PHONE_HIT_PX = 44;
const PHASE_INDEX: Record<Phase, 0 | 1 | 2> = { shape: 0, runs: 1, final: 2 };

export interface BoardPhoneProps {
  store: StoreApi<PitchStore>;
}

function roleLabel(doc: PitchDocument, player: Player) {
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  return FM26_DATA.roles.find((role) => role.id === roleId)?.name;
}

export function BoardPhone({ store }: BoardPhoneProps) {
  const doc = useStore(store, (state) => state.doc);
  const tactic = useStore(store, (state) => state.tactic);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const view = useBoardPieces(store);
  const metrics = useBoardMetrics();
  const [menuOpen, setMenuOpen] = useState(false);
  const [benchOpen, setBenchOpen] = useState(false);
  const [matchupOpen, setMatchupOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(
    () => JSON.stringify(store.getState().doc) === JSON.stringify(createExampleDocument()),
  );
  const menuSlot = useRef<HTMLDivElement>(null);
  const benchSlot = useRef<HTMLDivElement>(null);
  const matchupSlot = useRef<HTMLDivElement>(null);
  const canReset = doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null;
  const fm = ui.mode === 'fm';
  const dark = ui.theme === 'dark';
  const cursor = setupCursor(doc, ui.setupStep);
  const carrier = doc.players.find((player) => player.id === doc.scenario?.carrierId);
  const acting = ui.action !== null;
  const ballZone = zoneOf(doc.ball, doc.attacker);
  const hasAttackerFormation = formationOf(FM26_DATA, doc.teams[doc.attacker].formationId) !== null;
  const carrierOptions = useMemo(() => (fm ? carrierOptionsOf(doc, FM26_DATA) : []), [fm, doc]);
  const passOptions = useMemo(() => (fm ? passOptionsOf(doc, FM26_DATA) : []), [fm, doc]);
  const drag = useBoardDrag(store);
  const draggedPlayerId = ui.drag?.target.kind === 'player' ? ui.drag.target.id : null;
  const draggingFromPitch = !fm && doc.players.some((p) => p.id === draggedPlayerId && p.base);

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

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const benchCount = benchPieces(doc, FM26_DATA).length;
  const menuItems: PhoneMenuEntry[] = [
    {
      icon: 'edit',
      label: `${MODE_ITEM_PREFIX}${MODE_LABELS[fm ? 'fm' : 'open']}`,
      onSelect: choose(() => store.getState().setMode(fm ? 'openPitch' : 'fm')),
    },
    {
      icon: 'reset',
      label: RESET_LABEL,
      disabled: !canReset,
      note: canReset ? undefined : RESET_DISABLED_REASON,
      onSelect: choose(() => store.getState().dispatch({ type: 'reset' })),
    },
    {
      icon: 'clear',
      label: CLEAR_LABEL,
      onSelect: choose(() => store.getState().dispatch({ type: 'clearScenario' })),
    },
    {
      icon: dark ? 'sun' : 'moon',
      label: dark ? THEME_LIGHT_LABEL : THEME_DARK_LABEL,
      onSelect: choose(() => store.getState().patchUi({ theme: dark ? 'light' : 'dark' })),
    },
  ];

  const pieceScale = { ppu: metrics.ppu, tokenPx: metrics.tokenPx, hitPx: PHONE_HIT_PX };
  const ballAtCentre = doc.ball.x === BALL_START.x && doc.ball.y === BALL_START.y;
  const onBallKey = (event: KeyboardEvent<SVGGElement>) => {
    const next = pieceKeyStep(doc.ball, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    store.getState().dispatch({ type: 'placeBall', point: next });
  };
  const pitchStyle = { width: `${metrics.pitchW}px` };
  const piecesOnPitch = doc.players.filter(
    (player) => player.base !== undefined || player.id === draggedPlayerId,
  );
  const onTokenKey = (player: Player) => (event: KeyboardEvent<SVGGElement>) => {
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
  const squadTeams: SquadControlTeam[] = SIDES.map((team) => ({
    team,
    name: doc.teams[team].name,
    squadSize: doc.teams[team].squadSize,
    keeper: doc.teams[team].keeper,
    blockedSizes: SQUAD_SIZES.filter((size) => !canSetSquadSize(tactic, ui.mode, team, size)),
  }));
  const placeFromBench = (playerId: string) => {
    const player = doc.players.find((candidate) => candidate.id === playerId);
    if (!player) return;
    store.getState().dispatch({
      type: 'movePlayer',
      playerId,
      point: benchPlacementPoint(doc, player.team),
    });
    setBenchOpen(false);
  };

  const pitch = (
    <div className={styles.pitch} style={pitchStyle}>
      <PitchFrame
        attacking={doc.attacker}
        mine={doc.teams.mine.name}
        opponent={doc.teams.opponent.name}
      >
        <Pitch label={PITCH_LABEL} svgRef={drag.svgRef}>
          {piecesOnPitch.map((player) => {
            const point = view.pieces.get(player.id);
            if (!point) return null;
            const selected = player.id === selectedId;
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
                role={fm ? roleLabel(doc, player) : undefined}
                showRole={fm && selected}
                selected={selected}
                dragging={draggedPlayerId === player.id}
                onPointerDown={(event) => {
                  setSelectedId(player.id);
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
            dragging={ui.drag?.target.kind === 'ball'}
            onPointerDown={drag.startDrag(BALL_PIECE_ID)}
            onKeyDown={onBallKey}
          />
        </Pitch>
      </PitchFrame>
    </div>
  );

  return (
    <div className={styles.board} data-mode={ui.mode}>
      <header className={styles.top}>
        <div className={styles['title-block']}>
          <div
            className={styles.title}
          >{`${doc.teams.mine.name} v ${doc.teams.opponent.name}`}</div>
          <div className={styles.sub}>{MODE_LABELS[fm ? 'fm' : 'open']}</div>
        </div>
        <UndoControl canUndo={canUndo} redo={false} onUndo={() => store.getState().undo()} />
        <div ref={menuSlot}>
          <Button
            variant="icon"
            icon="menu"
            label={MENU_LABEL}
            pressed={menuOpen}
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </header>
      <div className={styles.body}>
        {fm && cursor !== null ? (
          <div className={styles.setup}>
            <SetupFlow store={store} phone />
          </div>
        ) : (
          <>
            {showHint && fm ? (
              <div className={styles.hint}>
                <FirstRunHint onDismiss={() => setShowHint(false)} />
              </div>
            ) : null}
            {pitch}
            {draggingFromPitch ? (
              <BenchDropZone dropRef={drag.benchRef} over={drag.overBench} />
            ) : null}
            {fm ? (
              <Instrument>
                <TransportBar
                  phone
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
              </Instrument>
            ) : (
              <>
                <BallCard
                  zone={ballZone}
                  atCentre={ballAtCentre}
                  onCentre={() =>
                    store.getState().dispatch({ type: 'placeBall', point: BALL_START })
                  }
                />
                <div className={styles.actions}>
                  <div ref={benchSlot}>
                    <Button variant="secondary" onClick={() => setBenchOpen(true)}>
                      {BENCH_BUTTON_LABEL(benchCount)}
                    </Button>
                  </div>
                  <div ref={matchupSlot}>
                    <Button variant="secondary" onClick={() => setMatchupOpen(true)}>
                      {MATCHUP_BUTTON_LABEL}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {fm ? (
              <Instrument>
                <ZoneMap
                  phone
                  value={hasAttackerFormation ? ballZone : null}
                  unfinished={selectUnfinishedZones(doc)}
                  carrier={carrier ? pieceLabel(doc, carrier, FM26_DATA) : undefined}
                  attackerName={doc.teams[doc.attacker].name}
                  onPick={(zone) => {
                    if (!acting) store.getState().dispatch({ type: 'tapZone', zone });
                  }}
                />
                {hasAttackerFormation ? (
                  <>
                    <CarrierPicker
                      zone={zoneName(ballZone)}
                      options={carrierOptions}
                      value={doc.scenario?.carrierId ?? null}
                      onChoose={(playerId) => {
                        if (!acting) store.getState().dispatch({ type: 'setCarrier', playerId });
                      }}
                    />
                    <PassControl
                      teammates={passOptions}
                      busy={acting}
                      onPass={(receiverId) =>
                        store.getState().startAction({ type: 'pass', receiverId })
                      }
                    />
                  </>
                ) : null}
              </Instrument>
            ) : null}
          </>
        )}
      </div>
      {menuOpen ? <PhoneMenu items={menuItems} onClose={() => setMenuOpen(false)} /> : null}
      {benchOpen ? (
        <BenchSheet
          pieces={benchPieces(doc, FM26_DATA)}
          placed={placedPlayers(doc).length}
          teams={squadTeams}
          onSquadSize={(team, size) =>
            store.getState().dispatch({ type: 'setSquadSize', team, size })
          }
          onKeeper={(team, keeper) =>
            store.getState().dispatch({ type: 'setKeeper', team, keeper })
          }
          onPlace={placeFromBench}
          onClose={() => setBenchOpen(false)}
          returnFocus={benchSlot}
        />
      ) : null}
      {matchupOpen ? (
        <MatchupSheet
          store={store}
          onClose={() => setMatchupOpen(false)}
          returnFocus={matchupSlot}
        />
      ) : null}
    </div>
  );
}
