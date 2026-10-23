import { MODE_LABELS, SETUP_CARD_HINT, SETUP_CARD_START, SETUP_CARD_TITLE } from '../../copy';
import { Button } from '../../controls/Button';
import styles from './setup-card.module.scss';

export interface SetupCardProps {
  onStart: () => void;
}

export function SetupCard({ onStart }: SetupCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.eyebrow}>{MODE_LABELS.fm}</div>
      <h2 className={styles.title}>{SETUP_CARD_TITLE}</h2>
      <p className={styles.hint}>{SETUP_CARD_HINT}</p>
      <Button variant="primary" onClick={onStart}>
        {SETUP_CARD_START}
      </Button>
    </section>
  );
}
