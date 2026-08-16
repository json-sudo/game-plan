import type { CSSProperties } from 'react';
import type { Piece } from '../../board/types';
import {
  FORMATION_ANIMATION_MS,
  useBoard,
  useBoardAnimating,
  useBoardAnimatingDuration,
  useBoardDispatch,
} from '../../board/BoardContext';
import { useDrag } from '../../board/DragContext';
import { useVisualize } from '../../board/VisualizeContext';
import { PITCH_H, PITCH_W } from '../../board/pitchGeometry';
import { useNameEditor } from '../NameEditor';
import ballImg from '../../assets/ball.png';
import './pitch.scss';

// SVG text can't ellipsize itself; cap rendered names and expose the full
// name via <title>. Tuned by eye against the 2.2-radius token.
const NAME_DISPLAY_CHARS = 12;

function truncateName(name: string): string {
  return name.length > NAME_DISPLAY_CHARS ? `${name.slice(0, NAME_DISPLAY_CHARS - 1)}…` : name;
}

function PitchPiece({ piece }: { piece: Piece }) {
  const { startDrag, draggingId } = useDrag();
  const { renaming, openNameEditor } = useNameEditor();
  const visualize = useVisualize();
  const dispatch = useBoardDispatch();
  if (!piece.position) return null;
  const { x, y } = piece.position;
  const color = piece.fill.kind === 'solid' ? piece.fill.color : piece.fill.primary;
  const isBall = piece.type === 'ball';
  const nameable = renaming && !isBall;
  const isCarrierRing = visualize.active && visualize.carrierId === piece.id;
  const isTargetRing =
    visualize.active && visualize.action === 'pass' && visualize.passTargetId === piece.id;

  const onPointerDown = (e: React.PointerEvent) => {
    if (visualize.active) {
      if (!isBall && piece.team === visualize.attacker) {
        e.preventDefault();
        visualize.selectCarrier(piece.id);
        dispatch({ type: 'PLACE_VISUALIZE_BALL_HOP', position: { x, y } });
      }
      return;
    }
    if (nameable) {
      e.preventDefault();
      openNameEditor(piece, e.currentTarget.getBoundingClientRect());
      return;
    }
    startDrag(piece, e);
  };

  return (
    <g
      className={nameable ? 'pitch__piece pitch__piece--nameable' : 'pitch__piece'}
      transform={`translate(${x} ${y})`}
      opacity={draggingId === piece.id ? 0.3 : 1}
      onPointerDown={onPointerDown}
      aria-label={
        isBall ? 'ball' : `${piece.team === 'mine' ? 'my team' : 'opponent'} ${piece.label}`
      }
    >
      {isBall ? (
        <image href={ballImg} x={-1.2} y={-1.2} width={2.4} height={2.4} />
      ) : (
        <>
          {(isCarrierRing || isTargetRing) && (
            <circle r={3.1} className="pitch__visualize-ring" />
          )}
          <circle r={2.2} fill={color} />
          <text className="pitch__label">{piece.label}</text>
          {piece.name && (
            <>
              <title>{piece.name}</title>
              <text className="pitch__name" y={3.9}>
                {truncateName(piece.name)}
              </text>
            </>
          )}
        </>
      )}
    </g>
  );
}

export function Pitch() {
  const board = useBoard();
  const animating = useBoardAnimating();
  const animatingDuration = useBoardAnimatingDuration();
  const { pitchRef } = useDrag();
  const visualize = useVisualize();
  const placed = board.pieces.filter((p) => p.position !== undefined);
  const cx = PITCH_W / 2;

  const carrierPiece =
    visualize.active && visualize.carrierId
      ? board.pieces.find((p) => p.id === visualize.carrierId)
      : undefined;
  const passTargetPiece =
    visualize.active && visualize.action === 'pass' && visualize.passTargetId
      ? board.pieces.find((p) => p.id === visualize.passTargetId)
      : undefined;

  return (
    <svg
      ref={pitchRef}
      className={animating ? 'pitch pitch--animating' : 'pitch'}
      style={
        {
          '--formation-anim-duration': `${animatingDuration ?? FORMATION_ANIMATION_MS}ms`,
        } as CSSProperties
      }
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      role="img"
      aria-label="pitch"
    >
      <rect width={PITCH_W} height={PITCH_H} fill="var(--pitch)" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={i * 12.5} width={PITCH_W} height={12.5} fill="var(--pitch-stripe)" />
      ))}

      <g fill="none" stroke="var(--pitch-line)" strokeWidth={0.25}>
        <rect x={1} y={1} width={74.19} height={98} />
        <line x1={1} y1={50} x2={75.19} y2={50} />
        <circle cx={cx} cy={50} r={8.7} />
        {/* penalty areas */}
        <rect x={15.5} y={1} width={45.2} height={15.7} />
        <rect x={15.5} y={83.3} width={45.2} height={15.7} />
        {/* goal areas */}
        <rect x={27.85} y={1} width={20.5} height={5.2} />
        <rect x={27.85} y={93.8} width={20.5} height={5.2} />
        {/* penalty arcs */}
        <path d="M 31.12 16.7 A 8.7 8.7 0 0 0 45.08 16.7" />
        <path d="M 31.12 83.3 A 8.7 8.7 0 0 1 45.08 83.3" />
        {/* corner quadrants */}
        <path d="M 1 3 A 2 2 0 0 0 3 1" />
        <path d="M 73.19 1 A 2 2 0 0 0 75.19 3" />
        <path d="M 3 99 A 2 2 0 0 0 1 97" />
        <path d="M 75.19 97 A 2 2 0 0 0 73.19 99" />
      </g>
      <g fill="var(--pitch-line)">
        <circle cx={cx} cy={50} r={0.45} />
        <circle cx={cx} cy={11.5} r={0.45} />
        <circle cx={cx} cy={88.5} r={0.45} />
      </g>

      {placed.length === 0 && (
        <>
          <g className="pitch__hint pitch__hint--wide">
            <text x={cx} y={48.6} className="pitch__hint-main">
              drag pieces from the bench
            </text>
            <text x={cx} y={52.4} className="pitch__hint-sub">
              or use a formation preset
            </text>
          </g>
          <g className="pitch__hint pitch__hint--compact">
            <text x={cx} y={50.5} className="pitch__hint-main">
              pick a formation
            </text>
          </g>
        </>
      )}

      {carrierPiece?.position && passTargetPiece?.position && (
        <line
          className="pitch__visualize-line"
          x1={carrierPiece.position.x}
          y1={carrierPiece.position.y}
          x2={passTargetPiece.position.x}
          y2={passTargetPiece.position.y}
        />
      )}

      {placed.map((p) => (
        <PitchPiece key={p.id} piece={p} />
      ))}
    </svg>
  );
}
