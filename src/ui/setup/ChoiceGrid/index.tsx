import { useId } from 'react';
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
}

export function ChoiceGrid({ label, mark, options, value, onChange, columns }: ChoiceGridProps) {
  const labelId = useId();
  const valueOf = (option: ChoiceOption) => option.value ?? option.label;
  const roving = useRovingRadio({ values: options.map(valueOf), value, onChange });

  return (
    <div className={styles.grid}>
      {label ? (
        <div id={labelId} className={styles.label}>
          {mark ? <TeamMark team={mark} /> : null}
          {label}
        </div>
      ) : null}
      <div
        className={styles.choices}
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
      >
        {options.map((option) => {
          const optionValue = valueOf(option);
          return (
            <button
              key={optionValue}
              ref={roving.register(optionValue)}
              type="button"
              role="radio"
              className={styles.choice}
              aria-checked={optionValue === value}
              tabIndex={roving.tabIndexFor(optionValue)}
              onClick={() => onChange?.(optionValue)}
              onKeyDown={roving.onKeyDown}
            >
              {option.label}
              {option.sub ? <small className={styles.sub}>{option.sub}</small> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
