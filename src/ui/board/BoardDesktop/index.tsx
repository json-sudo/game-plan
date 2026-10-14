import { useStore, type StoreApi } from 'zustand';
import { placedPlayers } from '../../../state/document';
import { selectCanUndo, selectDisplayPositions } from '../../../state/selectors';
import type { PitchStore } from '../../../state/store';
import { UndoControl } from '../../chrome/UndoControl';
import { MODE_OPTIONS, PITCH_LABEL, RESET_DISABLED_REASON, RESET_LABEL } from '../../copy';
import { Button } from '../../controls/Button';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { usePitchDrag } from '../../hooks/usePitchDrag';
import { Ball } from '../../pitch/Ball';
import { Pitch } from '../../pitch/Pitch';
import { PitchFrame } from '../../pitch/PitchFrame';
import { PlayerToken } from '../../pitch/PlayerToken';
import styles from './board-desktop.module.scss';

const BALL_DRAG_ID = 'ball';

export interface BoardDesktopProps {
  store: StoreApi<PitchStore>;
}

export function BoardDesktop({ store }: BoardDesktopProps) {
  const doc = useStore(store, (state) => state.doc);
  const ui = useStore(store, (state) => state.ui);
  const canUndo = useStore(store, selectCanUndo);
  const positions = useStore(store, selectDisplayPositions);
  const canReset = doc.teams.mine.applied !== null || doc.teams.opponent.applied !== null;
  const ballPoint = ui.drag?.target.kind === 'ball' ? ui.drag.point : doc.ball;

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
      <div className={styles.tools}>
        <SegmentedControl
          label="Mode"
          value={ui.mode === 'fm' ? 'fm' : 'open'}
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
      </div>
      <PitchFrame
        attacking={doc.attacker}
        mine={doc.teams.mine.name}
        opponent={doc.teams.opponent.name}
      >
        <Pitch label={PITCH_LABEL} svgRef={drag.svgRef}>
          {placedPlayers(doc).map((player) => {
            const point = positions.get(player.id);
            if (!point) return null;
            const dragging = ui.drag?.target.kind === 'player' && ui.drag.target.id === player.id;
            return (
              <PlayerToken
                key={player.id}
                x={point.x}
                y={point.y}
                team={player.team}
                keeper={player.isKeeper}
                label={player.slot ?? ''}
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
  );
}
