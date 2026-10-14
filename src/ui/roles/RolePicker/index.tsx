import { useId } from 'react';
import type { Point, Side } from '../../../data/types';
import type { ZoneId } from '../../../data/zones';
import { ROLE_CURRENT_MARK, ROLE_PHASE_LABELS, roleCount, tokenSideLabel } from '../../copy';
import { useRovingRadio } from '../../hooks/useRovingRadio';
import { RolePreview } from '../RolePreview';
import styles from './role-picker.module.scss';

export interface RolePickerRole {
  id: string;
  name: string;
  desc: string;
  from: Point;
  to: Point;
}

export interface RolePickerProps {
  slotLabel: string;
  side?: 'left' | 'right';
  phase: keyof typeof ROLE_PHASE_LABELS;
  team?: Side;
  roles: readonly RolePickerRole[];
  current: string;
  value?: string;
  zone?: ZoneId;
  onChoose?: (id: string) => void;
}

export function RolePicker({
  slotLabel,
  side,
  phase,
  team = 'mine',
  roles,
  current,
  value,
  zone,
  onChoose,
}: RolePickerProps) {
  const headingId = useId();
  const roving = useRovingRadio({
    values: roles.map((role) => role.id),
    value,
    onChange: onChoose,
  });
  const chosen = roles.find((role) => roving.isSelected(role.id)) ?? roles[0];
  const summary = [
    ROLE_PHASE_LABELS[phase],
    side ? tokenSideLabel(side) : null,
    roleCount(roles.length),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className={styles.picker} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        {slotLabel}
      </h2>
      <p className={styles.summary}>{summary}</p>
      <div className={styles.list} role="radiogroup" aria-labelledby={headingId}>
        {roles.map((role) => (
          <button
            key={role.id}
            ref={roving.register(role.id)}
            type="button"
            role="radio"
            className={styles.row}
            aria-checked={roving.isSelected(role.id)}
            tabIndex={roving.tabIndexFor(role.id)}
            onClick={() => roving.select(role.id)}
            onKeyDown={roving.onKeyDown}
          >
            <span>{role.name}</span>
            {role.id === current ? (
              <span className={styles.current}>{ROLE_CURRENT_MARK}</span>
            ) : null}
          </button>
        ))}
      </div>
      {chosen ? (
        <div className={styles.detail}>
          <RolePreview
            from={chosen.from}
            to={chosen.to}
            zone={zone}
            team={team}
            label={chosen.name}
          />
          <p className={styles.desc}>{chosen.desc}</p>
        </div>
      ) : null}
    </section>
  );
}
