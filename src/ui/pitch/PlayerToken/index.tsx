import type { KeyboardEvent, PointerEvent } from 'react';
import type { Side } from '../../../data/types';
import { PIECE_NAME_ON_TOKEN_MAX_LENGTH } from '../../../state/document';
import { KEEPER_LABEL, TOKEN_TEAM_LABELS, tokenSideLabel } from '../../copy';
import { DEFAULT_PIECE_SCALE, pieceUnits, type PieceScale } from '../piece-scale';
import styles from './player-token.module.scss';
import { RolePlate } from './role-plate';

export interface PlayerTokenProps {
  x: number;
  y: number;
  scale?: PieceScale;
  team?: Side;
  keeper?: boolean;
  label?: string;
  side?: 'left' | 'right';
  role?: string;
  name?: string;
  selected?: boolean;
  dragging?: boolean;
  fixed?: boolean;
  ghost?: boolean;
  showRole?: boolean;
  title?: string;
  onPointerDown?: (event: PointerEvent<SVGGElement>) => void;
  onKeyDown?: (event: KeyboardEvent<SVGGElement>) => void;
}

const DRAG_SCALE = 1.15;
const SQUARE_SCALE = 0.9;
const SQUARE_CORNER_SCALE = 0.42;
const NAME_PLATE_PADDING = 1.2;
const NAME_GLYPH_WIDTH = 0.56;
const LABEL_BASELINE = 0.36;

const BRACKETS = /[()]/g;

function truncateName(name: string): string {
  return name.length > PIECE_NAME_ON_TOKEN_MAX_LENGTH
    ? `${name.slice(0, PIECE_NAME_ON_TOKEN_MAX_LENGTH)}…`
    : name;
}

export function PlayerToken({
  x,
  y,
  scale = DEFAULT_PIECE_SCALE,
  team = 'mine',
  keeper = false,
  label = '',
  side,
  role,
  name,
  selected = false,
  dragging = false,
  fixed = false,
  ghost = false,
  showRole = false,
  title,
  onPointerDown,
  onKeyDown,
}: PlayerTokenProps) {
  const units = pieceUnits(scale);
  const r = units.radius;
  const fullLabel = keeper ? label || KEEPER_LABEL : label;
  const shownLabel = fullLabel.replace(BRACKETS, '');
  const half = r * SQUARE_SCALE;
  const shownName = name ? truncateName(name) : null;
  const namePlateWidth = shownName
    ? shownName.length * units.nameFont * NAME_GLYPH_WIDTH + NAME_PLATE_PADDING * units.nameFont
    : 0;
  const accessibleName = [
    fullLabel,
    side ? tokenSideLabel(side) : null,
    role,
    name,
    TOKEN_TEAM_LABELS[team],
  ]
    .filter(Boolean)
    .join(', ');
  const transform = `translate(${x}px, ${y}px)${dragging ? ` scale(${DRAG_SCALE})` : ''}`;
  const haloHalf = half + (units.haloRadius - r);

  return (
    <g
      className={styles.token}
      style={{ transform }}
      data-team={team}
      data-keeper={keeper || undefined}
      data-dragging={dragging || undefined}
      data-ghost={ghost || undefined}
      data-fixed={fixed || undefined}
      tabIndex={fixed ? undefined : 0}
      onPointerDown={fixed ? undefined : onPointerDown}
      onKeyDown={fixed ? undefined : onKeyDown}
      role={fixed ? 'img' : 'button'}
      aria-label={accessibleName}
      aria-pressed={fixed ? undefined : selected}
    >
      {title ? <title>{title}</title> : null}
      {fixed ? null : <circle className={styles.hit} r={units.hitRadius} />}
      {selected && team === 'opponent' ? (
        <rect
          className={styles.halo}
          data-part="halo"
          x={-haloHalf}
          y={-haloHalf}
          width={haloHalf * 2}
          height={haloHalf * 2}
          rx={r * SQUARE_CORNER_SCALE + (units.haloRadius - r)}
          style={{ strokeWidth: units.haloWidth }}
        />
      ) : null}
      {selected && team === 'mine' ? (
        <circle
          className={styles.halo}
          data-part="halo"
          r={units.haloRadius}
          style={{ strokeWidth: units.haloWidth }}
        />
      ) : null}
      {team === 'opponent' ? (
        <rect
          className={styles.body}
          data-part="body"
          x={-half}
          y={-half}
          width={half * 2}
          height={half * 2}
          rx={r * SQUARE_CORNER_SCALE}
          style={{ strokeWidth: units.bodyStroke }}
        />
      ) : (
        <circle
          className={styles.body}
          data-part="body"
          r={r}
          style={{ strokeWidth: units.bodyStroke }}
        />
      )}
      <text
        className={styles.label}
        y={units.labelFont(shownLabel) * LABEL_BASELINE}
        fontSize={units.labelFont(shownLabel)}
        textAnchor="middle"
      >
        {shownLabel}
      </text>
      {shownName ? (
        <g aria-hidden="true">
          <rect
            className={styles['name-plate']}
            x={-namePlateWidth / 2}
            y={-r - units.nameRise - units.namePlateHeight}
            width={namePlateWidth}
            height={units.namePlateHeight}
            rx={units.nameRise / 2}
          />
          <text
            className={styles['name-text']}
            y={-r - units.nameRise - units.namePlateHeight / 2}
            fontSize={units.nameFont}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {shownName}
          </text>
        </g>
      ) : null}
      {showRole && role ? (
        <RolePlate role={role} y={r + units.roleGap} fontSize={units.roleFont} />
      ) : null}
    </g>
  );
}
