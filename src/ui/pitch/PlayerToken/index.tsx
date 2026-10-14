import type { Side } from '../../../data/types';
import { PIECE_NAME_ON_TOKEN_MAX_LENGTH } from '../../../state/document';
import { KEEPER_LABEL, TOKEN_TEAM_LABELS, tokenSideLabel } from '../../copy';
import styles from './player-token.module.scss';
import { RolePlate } from './role-plate';

export interface PlayerTokenProps {
  x: number;
  y: number;
  team?: Side;
  keeper?: boolean;
  label?: string;
  side?: 'left' | 'right';
  role?: string;
  name?: string;
  selected?: boolean;
  dragging?: boolean;
  ghost?: boolean;
  showRole?: boolean;
  phone?: boolean;
}

const DESKTOP_RADIUS = 2.6;
const PHONE_RADIUS = 3.2;
const DESKTOP_HIT_RADIUS = 3.6;
const PHONE_HIT_RADIUS = 4.7;
const SQUARE_SCALE = 0.9;
const SQUARE_CORNER = 1.1;
const HALO_GAP = 0.85;
const DRAG_SCALE = 1.15;
const NAME_FONT_SIZE = 1.35;
const NAME_PLATE_HEIGHT = 2.05;
const NAME_PLATE_RISE = 2.5;
const NAME_TEXT_RISE = 1.02;
const NAME_GLYPH_WIDTH = 0.56;
const NAME_PLATE_PADDING = 1.2;
const ROLE_PLATE_GAP = 0.7;
const DESKTOP_ROLE_FONT_SIZE = 1.45;
const PHONE_ROLE_FONT_SIZE = 2.35;
const LABEL_BASELINE = 0.36;

function labelFontSize(label: string, phone: boolean): number {
  if (phone) return label.length > 3 ? 2 : 2.35;
  if (label.length > 4) return 1.3;
  return label.length > 3 ? 1.45 : 1.65;
}

function truncateName(name: string): string {
  return name.length > PIECE_NAME_ON_TOKEN_MAX_LENGTH
    ? `${name.slice(0, PIECE_NAME_ON_TOKEN_MAX_LENGTH)}…`
    : name;
}

export function PlayerToken({
  x,
  y,
  team = 'mine',
  keeper = false,
  label = '',
  side,
  role,
  name,
  selected = false,
  dragging = false,
  ghost = false,
  showRole = false,
  phone = false,
}: PlayerTokenProps) {
  const r = phone ? PHONE_RADIUS : DESKTOP_RADIUS;
  const rawLabel = keeper ? label || KEEPER_LABEL : label;
  const shownLabel = phone ? rawLabel.replace(/[()]/g, '') : rawLabel;
  const fontSize = labelFontSize(shownLabel, phone);
  const half = r * SQUARE_SCALE;
  const shownName = name ? truncateName(name) : null;
  const namePlateWidth = shownName
    ? shownName.length * NAME_FONT_SIZE * NAME_GLYPH_WIDTH + NAME_PLATE_PADDING
    : 0;
  const accessibleName = [
    shownLabel,
    side ? tokenSideLabel(side) : null,
    role,
    name,
    TOKEN_TEAM_LABELS[team],
  ]
    .filter(Boolean)
    .join(', ');
  const transform = `translate(${x}px, ${y}px)${dragging ? ` scale(${DRAG_SCALE})` : ''}`;
  const haloSize = (half + HALO_GAP) * 2;

  return (
    <g
      className={styles.token}
      style={{ transform }}
      data-team={team}
      data-keeper={keeper || undefined}
      data-dragging={dragging || undefined}
      data-ghost={ghost || undefined}
      tabIndex={0}
      role="button"
      aria-label={accessibleName}
      aria-pressed={selected}
    >
      <circle className={styles.hit} r={phone ? PHONE_HIT_RADIUS : DESKTOP_HIT_RADIUS} />
      {selected && team === 'opponent' ? (
        <rect
          className={styles.halo}
          data-part="halo"
          x={-haloSize / 2}
          y={-haloSize / 2}
          width={haloSize}
          height={haloSize}
          rx={SQUARE_CORNER + HALO_GAP}
        />
      ) : null}
      {selected && team === 'mine' ? (
        <circle className={styles.halo} data-part="halo" r={r + HALO_GAP} />
      ) : null}
      {team === 'opponent' ? (
        <rect
          className={styles.body}
          data-part="body"
          x={-half}
          y={-half}
          width={half * 2}
          height={half * 2}
          rx={SQUARE_CORNER}
        />
      ) : (
        <circle className={styles.body} data-part="body" r={r} />
      )}
      <text
        className={styles.label}
        y={fontSize * LABEL_BASELINE}
        fontSize={fontSize}
        textAnchor="middle"
      >
        {shownLabel}
      </text>
      {shownName ? (
        <g aria-hidden="true">
          <rect
            className={styles['name-plate']}
            x={-namePlateWidth / 2}
            y={-r - NAME_PLATE_RISE}
            width={namePlateWidth}
            height={NAME_PLATE_HEIGHT}
            rx={0.5}
          />
          <text
            className={styles['name-text']}
            y={-r - NAME_TEXT_RISE}
            fontSize={NAME_FONT_SIZE}
            textAnchor="middle"
          >
            {shownName}
          </text>
        </g>
      ) : null}
      {showRole && role ? (
        <RolePlate
          role={role}
          y={r + ROLE_PLATE_GAP}
          fontSize={phone ? PHONE_ROLE_FONT_SIZE : DESKTOP_ROLE_FONT_SIZE}
        />
      ) : null}
    </g>
  );
}
