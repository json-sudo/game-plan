import type { ZoneId } from '../../../data/zones';
import { zoneName } from '../../../engine';
import {
  BALL_AT_CENTRE_REASON,
  BALL_CARD_CENTRE_SPOT,
  BALL_CARD_HINT,
  BALL_CARD_LABEL,
  BALL_TO_CENTRE_LABEL,
} from '../../copy';
import { BallGlyph } from '../../pitch/BallGlyph';
import { Button } from '../../controls/Button';
import styles from './ball-card.module.scss';

const GLYPH_SIZE = 28;

export interface BallCardProps {
  zone: ZoneId;
  atCentre: boolean;
  onCentre: () => void;
}

export function BallCard({ zone, atCentre, onCentre }: BallCardProps) {
  return (
    <section className={styles.card} aria-label={BALL_CARD_LABEL}>
      <span className={styles.glyph}>
        <BallGlyph size={GLYPH_SIZE} />
      </span>
      <div className={styles.text}>
        <span className={styles.zone}>{atCentre ? BALL_CARD_CENTRE_SPOT : zoneName(zone)}</span>
        <span className={styles.hint}>{BALL_CARD_HINT}</span>
      </div>
      <Button
        variant="icon"
        size="sm"
        icon="reset"
        label={BALL_TO_CENTRE_LABEL}
        disabled={atCentre}
        disabledReason={atCentre ? BALL_AT_CENTRE_REASON : undefined}
        onClick={onCentre}
      />
    </section>
  );
}
