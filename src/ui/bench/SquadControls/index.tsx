import type { Side } from '../../../data/types';
import { SQUAD_SIZES, type SquadSize } from '../../../state/document';
import { SQUAD_SIZE_BLOCKED_REASON, keeperToggleLabel, squadSizeLabel } from '../../copy';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { Toggle } from '../../controls/Toggle';
import styles from './squad-controls.module.scss';

export interface SquadControlTeam {
  team: Side;
  name: string;
  squadSize: SquadSize;
  keeper: boolean;
  blockedSizes: readonly SquadSize[];
}

export interface SquadControlsProps {
  teams: readonly SquadControlTeam[];
  onSquadSize: (team: Side, size: SquadSize) => void;
  onKeeper: (team: Side, keeper: boolean) => void;
}

function squadSizeOf(value: string): SquadSize | undefined {
  return SQUAD_SIZES.find((size) => String(size) === value);
}

export function SquadControls({ teams, onSquadSize, onKeeper }: SquadControlsProps) {
  return (
    <div className={styles.controls}>
      {teams.map(({ team, name, squadSize, keeper, blockedSizes }) => (
        <div key={team} className={styles.team}>
          <SegmentedControl
            label={squadSizeLabel(name)}
            showLabel
            value={String(squadSize)}
            options={SQUAD_SIZES.map((size) => {
              const blocked = blockedSizes.includes(size);
              return {
                value: String(size),
                label: String(size),
                disabled: blocked,
                reason: blocked ? SQUAD_SIZE_BLOCKED_REASON : undefined,
              };
            })}
            onChange={(value) => {
              const size = squadSizeOf(value);
              if (size) onSquadSize(team, size);
            }}
          />
          <Toggle
            label={keeperToggleLabel(name)}
            checked={keeper}
            onChange={(next) => onKeeper(team, next)}
          />
        </div>
      ))}
    </div>
  );
}
