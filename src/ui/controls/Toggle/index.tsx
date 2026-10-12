import styles from './toggle.module.scss';

export interface ToggleProps {
  label: string;
  checked?: boolean;
  onChange?: (on: boolean) => void;
}

export function Toggle({ label, checked = false, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      className={styles.toggle}
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
    >
      <span className={styles.track}>
        <span className={styles.thumb} />
      </span>
      {label}
    </button>
  );
}
