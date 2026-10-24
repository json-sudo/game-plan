import type { CSSProperties, ReactNode, Ref } from 'react';
import { MARKING_BOX_EDGES, PITCH_H, PITCH_W } from '../../../engine';
import styles from './pitch.module.scss';

const BAND_COUNT = 10;
const BAND_HEIGHT = PITCH_H / BAND_COUNT;
const LINE_WIDTH = 0.4;
const LINE_INSET = 1;
const PENALTY_BOX = { ...MARKING_BOX_EDGES.penalty, depth: 16 };
const GOAL_BOX = { ...MARKING_BOX_EDGES.sixYard, depth: 6 };
const CENTRE_RADIUS = 9;
const NOTICE_PLATE = { width: 52, height: 7, top: 3 };
const NOTICE_TEXT_SIZE = 2.6;

export interface PitchProps {
  label: string;
  notice?: string;
  viewBox?: string;
  style?: CSSProperties;
  svgRef?: Ref<SVGSVGElement>;
  children?: ReactNode;
}

const BANDS = Array.from({ length: BAND_COUNT }, (_, index) => index);

function Box({ top, box }: { top: boolean; box: { x0: number; x1: number; depth: number } }) {
  return (
    <rect
      x={box.x0}
      y={top ? LINE_INSET : PITCH_H - LINE_INSET - box.depth}
      width={box.x1 - box.x0}
      height={box.depth}
    />
  );
}

export function Pitch({ label, notice, viewBox, style, svgRef, children }: PitchProps) {
  return (
    <svg
      ref={svgRef}
      className={styles.pitch}
      role="img"
      aria-label={label}
      viewBox={viewBox ?? `0 0 ${PITCH_W} ${PITCH_H}`}
      style={style}
    >
      {BANDS.map((index) => (
        <rect
          key={index}
          data-band={index}
          className={index % 2 === 0 ? styles.band : `${styles.band} ${styles['band--stripe']}`}
          x={0}
          y={index * BAND_HEIGHT}
          width={PITCH_W}
          height={BAND_HEIGHT}
        />
      ))}
      <g className={styles.lines} strokeWidth={LINE_WIDTH}>
        <rect
          x={LINE_INSET}
          y={LINE_INSET}
          width={PITCH_W - 2 * LINE_INSET}
          height={PITCH_H - 2 * LINE_INSET}
        />
        <line x1={LINE_INSET} x2={PITCH_W - LINE_INSET} y1={PITCH_H / 2} y2={PITCH_H / 2} />
        <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={CENTRE_RADIUS} />
        <Box top box={PENALTY_BOX} />
        <Box top={false} box={PENALTY_BOX} />
        <Box top box={GOAL_BOX} />
        <Box top={false} box={GOAL_BOX} />
      </g>
      {children}
      {notice ? (
        <g className={styles.notice}>
          <rect
            x={(PITCH_W - NOTICE_PLATE.width) / 2}
            y={NOTICE_PLATE.top}
            width={NOTICE_PLATE.width}
            height={NOTICE_PLATE.height}
            rx={1.5}
          />
          <text
            x={PITCH_W / 2}
            y={NOTICE_PLATE.top + NOTICE_PLATE.height / 2}
            fontSize={NOTICE_TEXT_SIZE}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {notice}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
