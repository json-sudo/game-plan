import { useState } from 'react';
import type { ReactNode } from 'react';
import { ballAtopPosition } from '../engine';
import type { ZoneId } from '../data/zones';
import { Bench } from '../ui/bench/Bench';
import { BenchChip } from '../ui/bench/BenchChip';
import type { BenchPiece } from '../ui/bench/BenchChip';
import { Instrument } from '../ui/instrument/Instrument';
import { TransportBar } from '../ui/instrument/TransportBar';
import { ZoneMap } from '../ui/instrument/ZoneMap';
import { Arrow } from '../ui/pitch/Arrow';
import { Ball } from '../ui/pitch/Ball';
import { BallGlyph } from '../ui/pitch/BallGlyph';
import { Pitch } from '../ui/pitch/Pitch';
import { PitchFrame } from '../ui/pitch/PitchFrame';
import { PlayerToken } from '../ui/pitch/PlayerToken';
import { RolePicker } from '../ui/roles/RolePicker';
import { RolePreview } from '../ui/roles/RolePreview';
import styles from './gallery.module.scss';
import { ZoneShapeShowcase } from './ZoneShapeShowcase';

const BENCH_PIECES: BenchPiece[] = [
  { id: 'mine-3', label: 'D(C)', team: 'mine', order: 2 },
  { id: 'mine-1', label: 'GK', team: 'mine', keeper: true, order: 0 },
  { id: 'opp-9', label: 'ST', team: 'opponent', order: 10, name: 'A name of twenty-four chars' },
];

const ROLES = [
  {
    id: 'wb',
    name: 'Wing-back',
    desc: 'Overlaps and provides width.',
    from: { x: 60, y: 60 },
    to: { x: 66, y: 40 },
  },
  {
    id: 'fb',
    name: 'Full-back',
    desc: 'Holds the line.',
    from: { x: 60, y: 60 },
    to: { x: 60, y: 56 },
  },
  {
    id: 'ifb',
    name: 'Inverted full-back',
    desc: 'Tucks inside.',
    from: { x: 60, y: 60 },
    to: { x: 46, y: 56 },
  },
];

const WINGER_ROLE = 'Winger';
const PREVIEW_ZONE: ZoneId = 'R-F';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.gallery__section} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

function PitchSample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className={styles.gallery__pitch}>
      <Pitch label={label}>{children}</Pitch>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function PitchGallery() {
  const [zone, setZone] = useState<ZoneId | null>('R-F');
  const [phase, setPhase] = useState<0 | 1 | 2>(1);
  const [playing, setPlaying] = useState(false);
  const [role, setRole] = useState('wb');

  return (
    <>
      <Section id="surface-title" title="Pitch surface">
        <div className={styles.gallery__columns}>
          <PitchFrame attacking="mine" mine="Mine" opponent="Opponent">
            <Pitch label="Pitch surface" notice="Opponent defending" />
          </PitchFrame>
          <PitchFrame attacking="opponent" mine="Mine" opponent="Opponent">
            <Pitch label="Pitch surface, opponent attacking" viewBox="0 50 76.19 50" />
          </PitchFrame>
        </div>
      </Section>

      <Section id="pieces-title" title="Pieces">
        <div className={styles.gallery__showcase}>
          <PitchSample label="Pitch with pieces">
            <PlayerToken x={20} y={30} team="mine" label="9" />
            <PlayerToken x={38} y={30} team="opponent" label="4" />
            <PlayerToken x={56} y={30} team="mine" label="1" keeper />
            <PlayerToken x={20} y={50} team="mine" label="7" selected role={WINGER_ROLE} showRole />
            <PlayerToken x={38} y={50} team="mine" label="8" name="A name of twenty-four chars" />
            <PlayerToken x={56} y={50} team="opponent" label="5" side="left" />
            <PlayerToken x={20} y={70} team="mine" label="3" dragging />
            <PlayerToken x={38} y={70} team="mine" label="6" ghost />
            <PlayerToken
              x={56}
              y={70}
              team="opponent"
              label="2"
              scale={{ ppu: 4.7, tokenPx: 30, hitPx: 44 }}
            />
          </PitchSample>
          <PitchSample label="Pitch with carrier ball">
            <PlayerToken x={30} y={40} team="mine" label="10" />
            <Ball {...ballAtopPosition({ x: 30, y: 40 })} />
            <PlayerToken x={50} y={60} team="opponent" label="4" />
            <Ball x={50} y={64} />
          </PitchSample>
          <div className={styles['gallery__inline-row']}>
            <BallGlyph />
            <BallGlyph size={32} />
          </div>
        </div>
      </Section>

      <Section id="arrows-title" title="Arrows">
        <div className={styles.gallery__showcase}>
          <PitchSample label="Pitch with arrows">
            <Arrow from={{ x: 20, y: 70 }} to={{ x: 30, y: 40 }} />
            <Arrow from={{ x: 56, y: 30 }} to={{ x: 50, y: 60 }} team="opponent" dim />
            <Arrow from={{ x: 38, y: 80 }} to={{ x: 38, y: 55 }} ring={false} />
          </PitchSample>
        </div>
      </Section>

      <Section id="zone-map-title" title="Zone map">
        <div className={styles.gallery__columns}>
          <Instrument>
            <ZoneMap value={zone} onPick={setZone} attackerName="Wing-back" presets />
          </Instrument>
          <Instrument>
            <ZoneMap value={null} phone />
          </Instrument>
        </div>
      </Section>

      <Section id="bench-title" title="Bench and chips">
        <div className={styles.gallery__columns}>
          <Bench pieces={BENCH_PIECES} placed={19} />
          <div className={styles.gallery__stack}>
            <Bench pieces={BENCH_PIECES} placed={19} dropping />
            <Bench pieces={[]} placed={22} />
            <div className={styles['gallery__inline-row']}>
              <BenchChip label="3" team="mine" />
              <BenchChip label="1" team="mine" keeper />
              <BenchChip label="9" team="opponent" name="Named piece" />
            </div>
          </div>
        </div>
      </Section>

      <Section id="roles-title" title="Roles">
        <div className={styles.gallery__columns}>
          <RolePicker
            slotLabel="Right back"
            side="right"
            phase="IP"
            roles={ROLES}
            current="fb"
            value={role}
            zone={PREVIEW_ZONE}
            onChoose={setRole}
          />
          <PitchSample label="Pitch with role preview">
            <RolePreview
              from={ROLES[0].from}
              to={ROLES[0].to}
              zone={PREVIEW_ZONE}
              label="Wing-back"
            />
          </PitchSample>
        </div>
      </Section>

      <Section id="transport-title" title="Transport">
        <div className={styles.gallery__stack}>
          <Instrument>
            <TransportBar
              phase={phase}
              playing={playing}
              onPhase={(next) => setPhase(next as 0 | 1 | 2)}
              onTogglePlay={() => setPlaying((value) => !value)}
            />
          </Instrument>
          <Instrument>
            <TransportBar phone phase={0} />
          </Instrument>
        </div>
      </Section>

      <ZoneShapeShowcase />
    </>
  );
}
