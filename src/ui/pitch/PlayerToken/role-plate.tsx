import styles from './player-token.module.scss';

interface RolePlateProps {
  role: string;
  y: number;
  fontSize: number;
}

const SINGLE_LINE_MAX_LENGTH = 11;
const LINE_HEIGHT = 1.18;
const GLYPH_WIDTH = 0.54;
const PADDING = 0.55;

function splitRole(role: string): string[] {
  const words = role.split(' ');
  if (role.length <= SINGLE_LINE_MAX_LENGTH || words.length === 1) return [role];
  let best = 1;
  let smallestGap = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const gap = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (gap < smallestGap) {
      smallestGap = gap;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

export function RolePlate({ role, y, fontSize }: RolePlateProps) {
  const lines = splitRole(role);
  const lineHeight = fontSize * LINE_HEIGHT;
  const width =
    Math.max(...lines.map((line) => line.length)) * fontSize * GLYPH_WIDTH + PADDING * 2;
  const height = lines.length * lineHeight + PADDING * 1.2;

  return (
    <g aria-hidden="true">
      <rect
        className={styles['role-plate']}
        x={-width / 2}
        y={y}
        width={width}
        height={height}
        rx={0.6}
      />
      {lines.map((line, i) => (
        <text
          key={line}
          className={styles['role-text']}
          y={y + PADDING * 0.6 + lineHeight * (i + 0.8)}
          fontSize={fontSize}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
