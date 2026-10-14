import { zoneBounds, zoneName } from '../../../engine';
import { GRID, type ZoneId } from '../../../data/zones';
import {
  CARRIER_PICKED_SUFFIX,
  NO_ZONE_HINT,
  NO_ZONE_TITLE,
  ATTACKING_TAG,
  ZONE_MAP_HEADING,
  ZONE_PRESETS,
  ZONE_UNFINISHED_MESSAGE,
  ZONE_UNFINISHED_SUFFIX,
  carrierLine,
} from '../../copy';
import { Button } from '../../controls/Button';
import { BallGlyph } from '../../pitch/BallGlyph';
import styles from './zone-map.module.scss';

export interface ZoneMapProps {
  value?: ZoneId | null;
  onPick?: (zone: ZoneId) => void;
  unfinished?: readonly ZoneId[];
  carrier?: string;
  carrierChanged?: boolean;
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

export function ZoneMap({
  value = null,
  onPick,
  unfinished = [],
  carrier,
  carrierChanged,
  attackerName,
  presets,
  phone,
}: ZoneMapProps) {
  const selectedUnfinished = value !== null && unfinished.includes(value);

  return (
    <section className={styles.map} data-phone={phone ? 'true' : undefined}>
      <h2 className={styles.heading}>{ZONE_MAP_HEADING}</h2>
      <div className={styles.grid} style={{ gridTemplateColumns: COLUMNS }}>
        {ROWS.flatMap((third) =>
          GRID.lanes.map((lane) => {
            const zone: ZoneId = `${lane}-${third}`;
            const isUnfinished = unfinished.includes(zone);
            const selected = zone === value;
            return (
              <button
                key={zone}
                type="button"
                className={styles.cell}
                data-lane={lane}
                data-half-space={HALF_SPACE_LANES.includes(lane) ? 'true' : undefined}
                data-selected={selected ? 'true' : undefined}
                data-unfinished={isUnfinished ? 'true' : undefined}
                aria-pressed={selected}
                aria-label={`${zoneName(zone)}${isUnfinished ? ZONE_UNFINISHED_SUFFIX : ''}`}
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
          {selectedUnfinished ? <p className={styles.note}>{ZONE_UNFINISHED_MESSAGE}</p> : null}
        </div>
      )}
      <p className={styles.tag}>{attackerName ? `${attackerName} ↑` : ATTACKING_TAG}</p>
      {carrier ? (
        <p className={styles.note}>
          {carrierLine(carrier)}
          {carrierChanged ? ` ${CARRIER_PICKED_SUFFIX}` : ''}
        </p>
      ) : null}
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
