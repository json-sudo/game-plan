import { zoneBounds, zoneName } from '../../../engine';
import { GRID, type ZoneId } from '../../../data/zones';
import {
  NO_ZONE_HINT,
  NO_ZONE_TITLE,
  ATTACKING_TAG,
  ZONE_MAP_HEADING,
  ZONE_PRESETS,
} from '../../copy';
import { Button } from '../../controls/Button';
import { BallGlyph } from '../../pitch/BallGlyph';
import styles from './zone-map.module.scss';

export interface ZoneMapProps {
  value?: ZoneId | null;
  onPick?: (zone: ZoneId) => void;
  attackerName?: string;
  presets?: boolean;
  phone?: boolean;
}

const ROWS = [...GRID.thirds].reverse();
const HALF_SPACE_LANES: readonly string[] = ['LH', 'RH'];
const BALL_GLYPH_SIZE = 18;

const laneWidths = GRID.lanes.map((lane) => {
  const { x0, x1 } = zoneBounds(`${lane}-F`);
  return x1 - x0;
});
const COLUMNS = laneWidths.map((width) => `${width}fr`).join(' ');

export function ZoneMap({ value = null, onPick, attackerName, presets, phone }: ZoneMapProps) {
  return (
    <section className={styles.map} data-phone={phone ? 'true' : undefined}>
      <h2 className={styles.heading}>{ZONE_MAP_HEADING}</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: COLUMNS }}>
        {ROWS.flatMap((third) =>
          GRID.lanes.map((lane) => {
            const zone: ZoneId = `${lane}-${third}`;
            const selected = zone === value;
            return (
              <button
                key={zone}
                type="button"
                className={styles.cell}
                data-lane={lane}
                data-half-space={HALF_SPACE_LANES.includes(lane) ? 'true' : undefined}
                data-selected={selected ? 'true' : undefined}
                aria-pressed={selected}
                aria-label={zoneName(zone)}
                onClick={() => onPick?.(zone)}
              >
                {selected ? <BallGlyph size={BALL_GLYPH_SIZE} /> : null}
              </button>
            );
          }),
        )}
      </div>
      <div className={styles.key} style={{ gridTemplateColumns: COLUMNS }} aria-hidden="true">
        {GRID.lanes.map((lane) => (
          <span key={lane}>{lane}</span>
        ))}
      </div>
      {value === null ? (
        <div>
          <p className={styles.name}>{NO_ZONE_TITLE}</p>
          <p className={styles.note}>{NO_ZONE_HINT}</p>
        </div>
      ) : (
        <div>
          <p className={styles.name}>{zoneName(value)}</p>
        </div>
      )}
      <p className={styles.tag}>{attackerName ? `${attackerName} ↑` : ATTACKING_TAG}</p>
      {presets ? (
        <div className={styles.presets}>
          {ZONE_PRESETS.map(({ label, zone }) => (
            <Button key={zone} onClick={() => onPick?.(zone)}>
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
