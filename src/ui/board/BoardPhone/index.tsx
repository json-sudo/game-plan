import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import { ballAtopPosition, MOTION_DURATIONS_MS, PHASES, zoneOf, type Phase } from '../../../engine';
import { activeRoleOf } from '../../../state/context';
import {
  BALL_START,
  playerSide,
  placedPlayers,
  playerLabel,
  type PitchDocument,
  type Player,
} from '../../../state/document';
import { createExampleDocument } from '../../../state/example';
import { selectCanUndo, selectDisplayPositions } from '../../../state/selectors';
import type { PitchStore } from '../../../state/store';
import { PhoneMenu, type PhoneMenuEntry } from '../../chrome/PhoneMenu';
import { FirstRunHint } from '../../feedback/FirstRunHint';
import { UndoControl } from '../../chrome/UndoControl';
import { BenchSheet } from '../../bench/BenchSheet';
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
import { Instrument } from '../../instrument/Instrument';
import { TransportBar } from '../../instrument/TransportBar';
import { ZoneMap } from '../../instrument/ZoneMap';
import { SetupFlow } from '../../setup/SetupFlow';
import { MatchupSheet } from '../../setup/MatchupSheet';
import { setupCursor } from '../../setup/setup-model';
import { Ball } from '../../pitch/Ball';
import { ballKeyStep } from '../../pitch/Ball/ball-keys';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import { usePitchDrag } from '../../hooks/usePitchDrag';
import { useBoardMetrics } from '../use-board-metrics';
import styles from './board-phone.module.scss';

const MODE_ITEM_PREFIX = 'Mode: ';
const MENU_LABEL = 'Menu';
const PHONE_HIT_PX = 44;
const BALL_DRAG_ID = 'ball';
const PHASE_INDEX: Record<Phase, 0 | 1 | 2> = { shape: 0, runs: 1, final: 2 };

export interface BoardPhoneProps {
  store: StoreApi<PitchStore>;
}

function roleLabel(doc: PitchDocument, player: Player) {
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  return FM26_DATA.roles.find((role) => role.id === roleId)?.name;
}

function benchPieces(doc: PitchDocument) {
  return doc.players.flatMap((player) =>
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
  );
}

export function BoardPhone({ store }: BoardPhoneProps) {
  const doc = useStore(store, (state) => state.doc);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const positions = useStore(store, selectDisplayPositions);
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
  const carrierPoint = carrier ? positions.get(carrier.id) : undefined;
  const ballTarget =
    ui.drag?.target.kind === 'ball'
      ? ui.drag.point
      : carrier && carrier.team === doc.attacker && carrierPoint
        ? ballAtopPosition(carrierPoint)
        : doc.ball;
  const ballDrag = usePitchDrag({
    onDragStart: () => {
      const state = store.getState();
      state.beginDrag({ kind: 'ball' }, state.doc.ball);
    },
    onDragMove: (_id, point) => store.getState().updateDrag(point),
    onDragEnd: (_id, point) => {
      const state = store.getState();
      state.updateDrag(point);
      state.endDrag();
    },
    onCancel: () => store.getState().cancelDrag(),
  });

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

  const attacker = doc.attacker;
  const benchCount = benchPieces(doc).length;
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
    const next = ballKeyStep(doc.ball, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    store.getState().dispatch({ type: 'dragBall', point: next });
  };
  const pitchStyle = { width: `${metrics.pitchW}px` };

  const pitch = (
    <div className={styles.pitch} style={pitchStyle}>
      <PitchFrame
        attacking={doc.attacker}
        mine={doc.teams.mine.name}
        opponent={doc.teams.opponent.name}
      >
        <Pitch label={PITCH_LABEL} svgRef={ballDrag.svgRef}>
          {placedPlayers(doc).map((player) => {
            const point = positions.get(player.id);
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
                label={playerLabel(player)}
                side={playerSide(player)}
                role={fm ? roleLabel(doc, player) : undefined}
                showRole={fm && selected}
                selected={selected}
                onPointerDown={() => setSelectedId(player.id)}
              />
            );
          })}
          <Ball
            x={ballTarget.x}
            y={ballTarget.y}
            scale={pieceScale}
            title={BALL_TOOLTIP}
            dragging={ui.drag?.target.kind === 'ball'}
            onPointerDown={ballDrag.startDrag(BALL_DRAG_ID)}
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
                  zone={zoneOf(doc.ball, doc.attacker)}
                  atCentre={ballAtCentre}
                  onCentre={() =>
                    store.getState().dispatch({ type: 'dragBall', point: BALL_START })
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
                  value={doc.scenario?.zone ?? null}
                  carrier={carrier ? playerLabel(carrier) : undefined}
                  attackerName={doc.teams[doc.attacker].name}
                  onPick={(zone) => store.getState().dispatch({ type: 'tapZone', zone })}
                />
              </Instrument>
            ) : null}
          </>
        )}
      </div>
      {menuOpen ? <PhoneMenu items={menuItems} onClose={() => setMenuOpen(false)} /> : null}
      {benchOpen ? (
        <BenchSheet
          pieces={benchPieces(doc)}
          placed={placedPlayers(doc).length}
          squadSize={doc.teams[attacker].squadSize}
          keeper={doc.teams[attacker].keeper}
          onSquadSize={(size) =>
            store.getState().dispatch({ type: 'setSquadSize', team: attacker, size })
          }
          onKeeper={(keeper) =>
            store.getState().dispatch({ type: 'setKeeper', team: attacker, keeper })
          }
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
