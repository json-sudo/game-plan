import { useId } from 'react';
import { useRovingRadio } from '../../hooks/useRovingRadio';
import styles from './segmented-control.module.scss';

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
  reason?: string;
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
  const reasonId = useId();
  const displayOnly = value !== undefined && !onChange;
  const roving = useRovingRadio({
    values: options.filter((option) => !option.disabled).map((option) => option.value),
    value,
    onChange,
  });
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? options[0]?.label;

  const group = displayOnly ? (
    <span
      className={styles.display}
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
    >
      {selectedLabel}
    </span>
  ) : (
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
          aria-label={option.disabled && option.reason ? option.label : undefined}
          aria-disabled={option.disabled || undefined}
          aria-describedby={
            option.disabled && option.reason ? `${reasonId}-${option.value}` : undefined
          }
          tabIndex={option.disabled ? -1 : roving.tabIndexFor(option.value)}
          onClick={option.disabled ? undefined : () => roving.select(option.value)}
          onKeyDown={roving.onKeyDown}
        >
          {option.label}
          {option.disabled && option.reason ? (
            <span id={`${reasonId}-${option.value}`} className={styles.reason}>
              {option.reason}
            </span>
          ) : null}
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
