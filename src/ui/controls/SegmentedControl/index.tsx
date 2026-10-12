import { useId } from 'react';
import { useRovingRadio } from '../../hooks/useRovingRadio';
import styles from './segmented-control.module.scss';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  label: string;
  showLabel?: boolean;
  options: SegmentedOption[];
  value?: string;
  onChange?: (value: string) => void;
}

export function SegmentedControl({
  label,
  showLabel = false,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  const labelId = useId();
  const roving = useRovingRadio({ values: options.map((option) => option.value), value, onChange });

  const group = (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          ref={roving.register(option.value)}
          type="button"
          role="radio"
          className={styles.option}
          aria-checked={roving.isSelected(option.value)}
          tabIndex={roving.tabIndexFor(option.value)}
          onClick={() => roving.select(option.value)}
          onKeyDown={roving.onKeyDown}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  if (!showLabel) return group;

  return (
    <div className={styles.labelled}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      {group}
    </div>
  );
}
