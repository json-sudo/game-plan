import { useId, useState } from 'react';
import { FORMATION_MORE_LABEL } from '../../copy';
import { TeamMark } from '../../controls/TeamMark';
import { useRovingRadio } from '../../hooks/useRovingRadio';
import styles from './choice-grid.module.scss';

export interface ChoiceOption {
  label: string;
  sub?: string;
  value?: string;
}

export interface ChoiceGridProps {
  label?: string;
  mark?: 'mine' | 'opp';
  options: ChoiceOption[];
  value?: string;
  onChange?: (value: string) => void;
  columns?: number;
  moreOptions?: ChoiceOption[];
}

export function ChoiceGrid({
  label,
  mark,
  options,
  value,
  onChange,
  columns,
  moreOptions = [],
}: ChoiceGridProps) {
  const labelId = useId();
  const [moreToggled, setMoreToggled] = useState(false);
  const valueOf = (option: ChoiceOption) => option.value ?? option.label;
  const displayOnly = value !== undefined && !onChange;
  const moreOpen = moreToggled || moreOptions.some((option) => valueOf(option) === value);
  const visible = moreOpen ? [...options, ...moreOptions] : options;
  const roving = useRovingRadio({ values: visible.map(valueOf), value, onChange });
  const radio = (option: ChoiceOption) => {
    const optionValue = valueOf(option);
    return (
      <button
        key={optionValue}
        ref={roving.register(optionValue)}
        type="button"
        role="radio"
        className={styles.choice}
        aria-checked={roving.isSelected(optionValue)}
        tabIndex={roving.tabIndexFor(optionValue)}
        onClick={() => roving.select(optionValue)}
        onKeyDown={roving.onKeyDown}
      >
        {option.label}
        {option.sub ? <small className={styles.sub}>{option.sub}</small> : null}
      </button>
    );
  };
  const gridStyle = columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined;

  return (
    <div className={styles.grid}>
      {label ? (
        <div id={labelId} className={styles.label}>
          {mark ? <TeamMark team={mark} /> : null}
          {label}
        </div>
      ) : null}
      {displayOnly ? (
        <div
          className={styles.choices}
          aria-labelledby={label ? labelId : undefined}
          style={gridStyle}
        >
          {options.map((option) => {
            const optionValue = valueOf(option);
            return (
              <div
                key={optionValue}
                className={styles.choice}
                data-selected={optionValue === value || undefined}
                aria-current={optionValue === value ? true : undefined}
              >
                {option.label}
                {option.sub ? <small className={styles.sub}>{option.sub}</small> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={styles.choices}
          role="radiogroup"
          aria-labelledby={label ? labelId : undefined}
          style={gridStyle}
        >
          {options.map(radio)}
          {moreOptions.length > 0 ? (
            <button
              type="button"
              className={styles.choice}
              aria-expanded={moreOpen}
              onClick={() => setMoreToggled(!moreOpen)}
            >
              {FORMATION_MORE_LABEL}
            </button>
          ) : null}
          {moreOpen ? moreOptions.map(radio) : null}
        </div>
      )}
    </div>
  );
}
