import { BallArt } from './ball-art';
import styles from './ball-glyph.module.scss';

export interface BallGlyphProps {
  size?: number;
}

const DEFAULT_SIZE = 16;

export function BallGlyph({ size = DEFAULT_SIZE }: BallGlyphProps) {
  return (
    <svg
      className={styles.glyph}
      width={size}
      height={size}
      viewBox="-1.1 -1.1 2.2 2.2"
      aria-hidden="true"
    >
      <BallArt />
    </svg>
  );
}
