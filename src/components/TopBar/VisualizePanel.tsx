import { useEffect } from 'react';
import type { BoardState, Piece, Team } from '../../board/types';
import { ballAtopPosition } from '../../board/pitchGeometry';
import { useBoard, useBoardDispatch } from '../../board/BoardContext';
import { useVisualize, type DribbleDirection } from '../../board/VisualizeContext';
import { getAvailableActions } from '../../board/visualizeActions';
import { computeVisualizeOutcome } from '../../board/visualizeCompute';

const DRIBBLE_DIRECTIONS: { value: DribbleDirection; label: string }[] = [
  { value: 'forward', label: 'Forward' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'back', label: 'Back' },
];

const ACTION_LABELS = {
  pass: 'Pass',
  dribble: 'Dribble',
  shoot: 'Shoot',
  clear: 'Clear',
} as const;

const NO_PIECES_TITLE = 'This team has no pieces on the pitch.';

export function hasPlacedPlayers(board: BoardState, team: Team): boolean {
  return board.pieces.some(
    (p) => p.team === team && p.type === 'player' && p.position !== undefined,
  );
}

const DRIBBLE_DIRECTION_ARROWS: Record<DribbleDirection, string> = {
  forward: '▲',
  left: '◀',
  right: '▶',
  back: '▼',
};

const DRIBBLE_DIRECTION_HINT: Record<DribbleDirection, string> = {
  forward: 'Forward selected.',
  left: 'Left selected.',
  right: 'Right selected.',
  back: 'Back selected.',
};

function DribbleDirectionPanel({ carrierPiece }: { carrierPiece: Piece | undefined }) {
  const visualize = useVisualize();
  const color = carrierPiece
    ? carrierPiece.fill.kind === 'solid'
      ? carrierPiece.fill.color
      : carrierPiece.fill.primary
    : undefined;

  return (
    <div className="dribble-panel" role="region" aria-label="Dribble direction">
      <div role="group" aria-label="Direction" className="dribble-panel__grid">
        {DRIBBLE_DIRECTIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            className={
              visualize.dribbleDirection === d.value
                ? `dribble-panel__arrow dribble-panel__arrow--${d.value} is-active`
                : `dribble-panel__arrow dribble-panel__arrow--${d.value}`
            }
            aria-label={d.label}
            onClick={() => visualize.selectDribbleDirection(d.value)}
          >
            {DRIBBLE_DIRECTION_ARROWS[d.value]}
          </button>
        ))}
        <div className="dribble-panel__center">
          {carrierPiece && (
            <span className="dribble-panel__dot" style={{ background: color }}>
              {carrierPiece.label}
            </span>
          )}
        </div>
      </div>
      <p className="dribble-panel__hint">
        {visualize.dribbleDirection
          ? DRIBBLE_DIRECTION_HINT[visualize.dribbleDirection]
          : 'Choose a direction.'}
      </p>
    </div>
  );
}

function VisualizeStep({
  attacker,
  setAttacker,
  onConfirm,
}: {
  attacker: Team;
  setAttacker: (team: Team) => void;
  onConfirm: () => void;
}) {
  const board = useBoard();
  const dispatch = useBoardDispatch();
  const visualize = useVisualize();

  useEffect(() => {
    visualize.start(attacker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacker]);

  const carrierPiece = visualize.carrierId
    ? board.pieces.find((p) => p.id === visualize.carrierId)
    : undefined;

  useEffect(() => {
    return () => visualize.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAttack = {
    mine: hasPlacedPlayers(board, 'mine'),
    opponent: hasPlacedPlayers(board, 'opponent'),
  };

  const carrierId = visualize.carrierId;
  const actions = carrierId ? getAvailableActions(board, attacker, carrierId) : [];

  const teammates = carrierId
    ? board.pieces.filter(
        (p) => p.team === attacker && p.type === 'player' && p.id !== carrierId && p.position,
      )
    : [];

  const confirmEnabled =
    visualize.action === 'pass'
      ? visualize.passTargetId !== null
      : visualize.action === 'dribble'
        ? visualize.dribbleDirection !== null
        : visualize.action !== null;

  const handleConfirm = () => {
    if (!carrierId || !visualize.action || !confirmEnabled) return;
    const outcome = computeVisualizeOutcome(board, {
      attacker,
      carrierId,
      action: visualize.action,
      passTargetId: visualize.passTargetId,
      dribbleDirection: visualize.dribbleDirection,
    });
    const carrierPreRunPosition = board.pieces.find((p) => p.id === carrierId)!.position!;
    dispatch({
      type: 'PLACE_VISUALIZE_BALL_HOP',
      position: ballAtopPosition(carrierPreRunPosition),
    });
    dispatch({
      type: 'APPLY_VISUALIZE_OUTCOME',
      outcome: Array.from(outcome, ([id, position]) => ({ id, position })),
    });
    onConfirm();
  };

  return (
    <div className="formation-modal__visualize">
      <div className="formation-modal__teams">
        <span className="formation-modal__teams-label">Attacking side</span>
        <div role="group" aria-label="Attacker">
          <button
            type="button"
            className={attacker === 'mine' ? 'is-active' : undefined}
            disabled={!canAttack.mine}
            title={canAttack.mine ? undefined : NO_PIECES_TITLE}
            onClick={() => setAttacker('mine')}
          >
            Mine
          </button>
          <button
            type="button"
            className={attacker === 'opponent' ? 'is-active' : undefined}
            disabled={!canAttack.opponent}
            title={canAttack.opponent ? undefined : NO_PIECES_TITLE}
            onClick={() => setAttacker('opponent')}
          >
            Opponent
          </button>
        </div>
      </div>

      {!carrierId ? (
        <p className="formation-modal__visualize-placeholder">
          Select a ball carrier by clicking a piece on the pitch.
        </p>
      ) : (
        <>
          {carrierPiece && (
            <div className="visualize-panel__carrier">
              <span
                className="visualize-panel__dot"
                style={{
                  background:
                    carrierPiece.fill.kind === 'solid'
                      ? carrierPiece.fill.color
                      : carrierPiece.fill.primary,
                }}
              />
              Carrier · {carrierPiece.label}
            </div>
          )}

          <div
            role="group"
            aria-label="Action"
            className="formation-modal__visualize-actions visualize-panel__pills"
          >
            {(['pass', 'dribble', 'shoot', 'clear'] as const)
              .filter((a) => actions.includes(a))
              .map((a) => (
                <button
                  key={a}
                  type="button"
                  className={visualize.action === a ? 'is-active' : undefined}
                  onClick={() => visualize.selectAction(a)}
                >
                  {ACTION_LABELS[a]}
                </button>
              ))}
          </div>

          {visualize.action === 'pass' && (
            <div role="group" aria-label="Pass target" className="visualize-panel__list">
              {teammates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={visualize.passTargetId === t.id ? 'is-active' : undefined}
                  onClick={() => visualize.selectPassTarget(t.id)}
                >
                  <span
                    className="visualize-panel__dot"
                    style={{
                      background: t.fill.kind === 'solid' ? t.fill.color : t.fill.primary,
                    }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {visualize.action && (
            <button
              type="button"
              className="formation-modal__visualize-confirm visualize-panel__confirm"
              disabled={!confirmEnabled}
              onClick={handleConfirm}
            >
              Confirm {ACTION_LABELS[visualize.action]}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function VisualizePanel({
  attacker,
  setAttacker,
  onClose,
}: {
  attacker: Team;
  setAttacker: (team: Team) => void;
  onClose: () => void;
}) {
  const board = useBoard();
  const visualize = useVisualize();
  const carrierPiece = visualize.carrierId
    ? board.pieces.find((p) => p.id === visualize.carrierId)
    : undefined;

  return (
    <>
      <div className="visualize-panel" role="region" aria-label="Visualize">
        <header className="formation-modal__header">
          <h2>Visualize</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <VisualizeStep attacker={attacker} setAttacker={setAttacker} onConfirm={onClose} />
      </div>
      {visualize.action === 'dribble' && <DribbleDirectionPanel carrierPiece={carrierPiece} />}
    </>
  );
}
