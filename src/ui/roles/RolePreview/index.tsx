import { PITCH_H, PITCH_W, zoneBounds } from '../../../engine';
import type { Point, Side } from '../../../data/types';
import { GRID, type ZoneId } from '../../../data/zones';
import { ROLE_HOLDS_POSITION } from '../../copy';
import { Arrow } from '../../pitch/Arrow';
import { BallArt } from '../../pitch/BallGlyph/ball-art';
import styles from './role-preview.module.scss';

export interface RolePreviewProps {
  from: Point;
  to: Point;
  zone?: ZoneId;
  team?: Side;
  label?: string;
}

const HALF_SPACE_LANES: readonly string[] = ['LH', 'RH'];
const PLAYER_RADIUS = 2.6;
const BALL_RADIUS = 2;

const laneBounds = GRID.lanes.map((lane) => ({ lane, ...zoneBounds(`${lane}-F`) }));
const laneEdges = laneBounds.map(({ x1 }) => x1).filter((x) => x < PITCH_W);
const halfSpaceCentres = laneBounds
  .filter(({ lane }) => HALF_SPACE_LANES.includes(lane))
  .map(({ x0, x1 }) => (x0 + x1) / 2);

export function RolePreview({ from, to, zone, team = 'mine', label }: RolePreviewProps) {
  const holds = from.x === to.x && from.y === to.y;
  const bounds = zone ? zoneBounds(zone) : null;

  return (
    <div className={styles.preview}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
        role="img"
        aria-label={label}
      >
        {bounds ? (
          <rect
            className={styles.zone}
            x={bounds.x0}
            y={bounds.y0}
            width={bounds.x1 - bounds.x0}
            height={bounds.y1 - bounds.y0}
          />
        ) : null}
        {laneEdges.map((x) => (
          <line key={x} className={styles.lane} x1={x} x2={x} y1={0} y2={PITCH_H} />
        ))}
        {halfSpaceCentres.map((x) => (
          <line key={x} className={styles.dashed} x1={x} x2={x} y1={0} y2={PITCH_H} />
        ))}
        {bounds ? (
          <g
            transform={`translate(${(bounds.x0 + bounds.x1) / 2} ${(bounds.y0 + bounds.y1) / 2}) scale(${BALL_RADIUS})`}
          >
            <BallArt />
          </g>
        ) : null}
        {holds ? null : <Arrow from={from} to={to} team={team} />}
        <circle
          className={styles.player}
          data-team={team}
          cx={from.x}
          cy={from.y}
          r={PLAYER_RADIUS}
        />
      </svg>
      {holds ? <p className={styles.note}>{ROLE_HOLDS_POSITION}</p> : null}
    </div>
  );
}
