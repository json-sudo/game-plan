import { zoneName } from '../../../engine';
import { GRID, type ZoneId } from '../../../data/zones';
import {
  NO_ZONE_HINT,
  NO_ZONE_TITLE,
  ATTACKING_TAG,
  ZONE_AFTER_HINT,
  ZONE_LOCKED_HINT,
  ZONE_MAP_HEADING,
} from '../../copy';
import { BallGlyph } from '../../pitch/BallGlyph';
import styles from './zone-map.module.scss';

export interface ZoneMapProps {
  value?: ZoneId | null;
  onPick?: (zone: ZoneId) => void;
  attackerName?: string;
  locked?: boolean;
  phone?: boolean;
}

const ROWS = [...GRID.thirds].reverse();
const HALF_SPACE_LANES: readonly string[] = ['LH', 'RH'];
const BALL_GLYPH_SIZE = 18;

const LANE_WIDTHS = [15.5, 12.3, 20.6, 12.3, 15.5];
const COLUMNS = LANE_WIDTHS.map((width) => `${width}fr`).join(' ');

export function ZoneMap({
  value = null,
  onPick,
  attackerName,
  locked = false,
  phone,
}: ZoneMapProps) {
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
                aria-disabled={locked ? true : undefined}
                aria-label={zoneName(zone)}
                onClick={locked ? undefined : () => onPick?.(zone)}
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
          <p className={styles.note}>{locked ? ZONE_LOCKED_HINT : NO_ZONE_HINT}</p>
        </div>
      ) : (
        <div>
          <p className={styles.name}>{zoneName(value)}</p>
          <p className={styles.note}>{ZONE_AFTER_HINT}</p>
        </div>
      )}
      <p className={styles.tag}>{attackerName ? `${attackerName} ↑` : ATTACKING_TAG}</p>
    </section>
  );
}
