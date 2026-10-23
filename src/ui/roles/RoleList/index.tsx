import type { Side } from '../../../data/types';
import { ROLE_CHANGED_TOOLTIP, ROLE_LIST_TEAM_LABEL } from '../../copy';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { Icon } from '../../controls/Icon';
import styles from './role-list.module.scss';

export interface RoleListRow {
  id: string;
  label: string;
  role: string;
  changed?: boolean;
}

export interface RoleListProps {
  heading: string;
  rows: RoleListRow[];
  team: Side;
  teamNames: Record<Side, string>;
  showTeamSwitch?: boolean;
  selected?: string;
  readOnly?: boolean;
  onTeam?: (team: Side) => void;
  onSelect?: (id: string) => void;
}

function RowBody({ row, readOnly }: { row: RoleListRow; readOnly: boolean }) {
  return (
    <>
      <span className={styles.label}>{row.label}</span>{' '}
      <span className={styles.role}>{row.role}</span>
      {row.changed ? (
        <span
          className={styles.changed}
          role="img"
          aria-label={ROLE_CHANGED_TOOLTIP}
          title={ROLE_CHANGED_TOOLTIP}
        />
      ) : null}
      {readOnly ? null : <Icon name="chevron" size={16} />}
    </>
  );
}

export function RoleList({
  heading,
  rows,
  team,
  teamNames,
  showTeamSwitch = false,
  selected,
  readOnly = false,
  onTeam,
  onSelect,
}: RoleListProps) {
  return (
    <div className={styles.list}>
      {showTeamSwitch ? (
        <SegmentedControl
          label={ROLE_LIST_TEAM_LABEL}
          value={team}
          options={[
            { value: 'mine', label: teamNames.mine },
            { value: 'opponent', label: teamNames.opponent },
          ]}
          onChange={(value) => {
            if (value === 'mine' || value === 'opponent') onTeam?.(value);
          }}
        />
      ) : null}
      <h3 className={styles.heading}>{heading}</h3>
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.id}>
            {readOnly ? (
              <div className={styles.row}>
                <RowBody row={row} readOnly />
              </div>
            ) : (
              <button
                type="button"
                className={styles.row}
                data-selected={row.id === selected || undefined}
                aria-pressed={row.id === selected}
                onClick={() => onSelect?.(row.id)}
              >
                <RowBody row={row} readOnly={false} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
