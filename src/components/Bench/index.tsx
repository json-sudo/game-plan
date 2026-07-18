import type { Piece, SquadSize, Team } from '../../board/types';
import { subNumber, TEAM_COLORS } from '../../board/boardReducer';
import { useBoard, useBoardDispatch } from '../../board/BoardContext';
import { useDrag } from '../../board/DragContext';
import { PieceToken } from '../PieceToken';
import './bench.scss';

const SQUAD_SIZES: SquadSize[] = [11, 20, 26];

function benchOrder(a: Piece, b: Piece): number {
  const rank = (p: Piece) => (p.isKeeper ? -1 : (subNumber(p) ?? 0));
  return rank(a) - rank(b);
}

function DraggableToken({ piece }: { piece: Piece }) {
  const { startDrag, draggingId } = useDrag();
  return (
    <span className={draggingId === piece.id ? 'bench__dragging-origin' : undefined}>
      <PieceToken piece={piece} onPointerDown={(e) => startDrag(piece, e)} />
    </span>
  );
}

function TeamPool({ team, title }: { team: Team; title: string }) {
  const board = useBoard();
  const dispatch = useBoardDispatch();

  const players = board.pieces.filter((p) => p.team === team && p.type === 'player');
  const benched = players.filter((p) => p.position === undefined).sort(benchOrder);
  const placed = players.length - benched.length;
  const keeperOn = board.keeper[team];

  return (
    <section className="bench__pool" aria-label={title}>
      <header className="bench__pool-header">
        <span
          className="bench__dot"
          style={{ background: team === 'mine' ? TEAM_COLORS.mine : TEAM_COLORS.opponent }}
        />
        <h2>{title}</h2>
        <span className="bench__counter">
          {placed}/{players.length}
        </span>
      </header>

      <div className="bench__grid">
        {benched.map((p) => (
          <DraggableToken key={p.id} piece={p} />
        ))}
      </div>

      <div className="bench__controls">
        <div className="bench__sizes" role="group" aria-label={`${title} squad size`}>
          {SQUAD_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={board.squad[team] === size ? 'is-active' : undefined}
              onClick={() => dispatch({ type: 'SET_SQUAD', team, size })}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`bench__keeper${keeperOn ? ' is-active' : ''}`}
          aria-pressed={keeperOn}
          onClick={() => dispatch({ type: 'SET_KEEPER', team, on: !keeperOn })}
        >
          <span
            className="bench__dot"
            style={{
              background: team === 'mine' ? TEAM_COLORS.mineKeeper : TEAM_COLORS.opponentKeeper,
            }}
          />
          Keeper {keeperOn ? 'on' : 'off'}
        </button>
      </div>
    </section>
  );
}

const KEY_ENTRIES: { label: string; color?: string; ball?: boolean }[] = [
  { label: 'My Team', color: TEAM_COLORS.mine },
  { label: 'My Keeper', color: TEAM_COLORS.mineKeeper },
  { label: 'Opponent', color: TEAM_COLORS.opponent },
  { label: 'Opp. Keeper', color: TEAM_COLORS.opponentKeeper },
  { label: 'Ball', ball: true },
];

export function Bench() {
  const board = useBoard();
  const ball = board.pieces.find((p) => p.type === 'ball');

  return (
    <aside className="bench">
      <div className="bench__ball">
        {ball && ball.position === undefined && <DraggableToken piece={ball} />}
        <span className="bench__hint">drag to pitch</span>
      </div>

      <TeamPool team="mine" title="My Team" />
      <TeamPool team="opponent" title="Opponent" />

      <section className="bench__key" aria-label="Key">
        <h2>Key</h2>
        <ul>
          {KEY_ENTRIES.map(({ label, color, ball }) => (
            <li key={label}>
              <span
                className={ball ? 'bench__dot bench__dot--ball' : 'bench__dot'}
                style={ball ? undefined : { background: color }}
              />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
