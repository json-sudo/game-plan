import styles from './team-mark.module.scss';

export interface TeamMarkProps {
  team: 'mine' | 'opp';
  size?: number;
}

const DEFAULT_SIZE = 16;

export function TeamMark({ team, size = DEFAULT_SIZE }: TeamMarkProps) {
  return (
    <span
      className={styles.mark}
      data-team={team}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
