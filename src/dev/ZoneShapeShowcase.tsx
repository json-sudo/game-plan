import { ballAtopPosition, zoneBounds } from '../engine';
import type { Point, Side } from '../data/types';
import { Arrow } from '../ui/pitch/Arrow';
import { Ball } from '../ui/pitch/Ball';
import { Pitch } from '../ui/pitch/Pitch';
import { PlayerToken } from '../ui/pitch/PlayerToken';
import styles from './gallery.module.scss';

interface Piece {
  label: string;
  team: Side;
  position: Point;
  keeper?: boolean;
}

const FORMATION_SLOTS: readonly Piece[] = [
  { label: '1', team: 'mine', position: { x: 38, y: 92 }, keeper: true },
  { label: '2', team: 'mine', position: { x: 62, y: 78 } },
  { label: '5', team: 'mine', position: { x: 46, y: 80 } },
  { label: '6', team: 'mine', position: { x: 30, y: 80 } },
  { label: '3', team: 'mine', position: { x: 14, y: 78 } },
  { label: '4', team: 'mine', position: { x: 38, y: 64 } },
  { label: '8', team: 'mine', position: { x: 54, y: 54 } },
  { label: '10', team: 'mine', position: { x: 22, y: 54 } },
  { label: '7', team: 'mine', position: { x: 64, y: 34 } },
  { label: '9', team: 'mine', position: { x: 38, y: 28 } },
  { label: '11', team: 'mine', position: { x: 12, y: 34 } },
  { label: '1', team: 'opponent', position: { x: 38, y: 6 }, keeper: true },
  { label: '4', team: 'opponent', position: { x: 52, y: 16 } },
  { label: '5', team: 'opponent', position: { x: 26, y: 16 } },
  { label: '2', team: 'opponent', position: { x: 66, y: 22 } },
  { label: '3', team: 'opponent', position: { x: 10, y: 22 } },
];

const SHAPE_PIECES: readonly Piece[] = [
  { label: '7', team: 'mine', position: { x: 64, y: 38 } },
  { label: '8', team: 'mine', position: { x: 52, y: 50 } },
  { label: '9', team: 'mine', position: { x: 40, y: 30 } },
  { label: '2', team: 'opponent', position: { x: 66, y: 24 } },
  { label: '4', team: 'opponent', position: { x: 52, y: 16 } },
];

const FINAL_PIECES: readonly Piece[] = [
  { label: '7', team: 'mine', position: { x: 62, y: 18 } },
  { label: '8', team: 'mine', position: { x: 54, y: 30 } },
  { label: '9', team: 'mine', position: { x: 44, y: 14 } },
  { label: '2', team: 'opponent', position: { x: 66, y: 24 } },
  { label: '4', team: 'opponent', position: { x: 52, y: 16 } },
];

const CARRIER = 0;
const ATTACKERS = 3;

function Tokens({ pieces }: { pieces: readonly Piece[] }) {
  return pieces.map((piece) => (
    <PlayerToken
      key={`${piece.team}-${piece.label}`}
      x={piece.position.x}
      y={piece.position.y}
      team={piece.team}
      label={piece.label}
      keeper={piece.keeper}
    />
  ));
}

function ZoneHighlight() {
  const { x0, x1, y0, y1 } = zoneBounds('R-F');
  return (
    <rect
      className={styles.gallery__zone}
      x={x0}
      y={y0}
      width={x1 - x0}
      height={y1 - y0}
      aria-hidden="true"
    />
  );
}

export function ZoneShapeShowcase() {
  return (
    <section className={styles.gallery__section} aria-labelledby="zone-shape-title">
      <h2 id="zone-shape-title">ZoneShape showcase</h2>
      <div className={styles.gallery__showcase}>
        <figure className={styles.gallery__pitch}>
          <Pitch label="Formation slots pitch">
            <Tokens pieces={FORMATION_SLOTS} />
          </Pitch>
          <figcaption>Formation slots</figcaption>
        </figure>
        <figure className={styles.gallery__pitch}>
          <Pitch label="Right flank - final third pitch, Shape">
            <ZoneHighlight />
            <Tokens pieces={SHAPE_PIECES} />
            <Ball {...ballAtopPosition(SHAPE_PIECES[CARRIER].position)} />
          </Pitch>
          <figcaption>Right flank - final third · Shape</figcaption>
        </figure>
        <figure className={styles.gallery__pitch}>
          <Pitch label="Right flank - final third pitch, Final">
            <ZoneHighlight />
            {FINAL_PIECES.slice(0, ATTACKERS).map((piece, index) => (
              <Arrow key={piece.label} from={SHAPE_PIECES[index].position} to={piece.position} />
            ))}
            <Tokens pieces={FINAL_PIECES} />
            <Ball {...ballAtopPosition(FINAL_PIECES[CARRIER].position)} />
          </Pitch>
          <figcaption>Right flank - final third · Final</figcaption>
        </figure>
      </div>
    </section>
  );
}
