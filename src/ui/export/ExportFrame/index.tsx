import type { Side } from '../../../data/types';
import { PITCH_H, PITCH_W } from '../../../engine';
import { EXPORT_FOOTER, PITCH_LABEL } from '../../copy';
import { TeamMark } from '../../controls/TeamMark';
import { Ball } from '../../pitch/Ball';
import { Pitch } from '../../pitch/Pitch';
import { PlayerToken } from '../../pitch/PlayerToken';
import { EXPORT_HEIGHT, EXPORT_PITCH_HEIGHT, EXPORT_WIDTH } from '../export-size';
import styles from './export-frame.module.scss';

export interface ExportToken {
  id: string;
  x: number;
  y: number;
  team: Side;
  keeper: boolean;
  label: string;
  side?: 'left' | 'right';
  role?: string;
}

export interface ExportFrameProps {
  mine: string;
  opponent?: string;
  zoneName?: string;
  tokens: readonly ExportToken[];
  ball?: { x: number; y: number };
  tokenPx: number;
}

const PITCH_WIDTH = Math.round((EXPORT_PITCH_HEIGHT * PITCH_W) / PITCH_H);
const PPU = PITCH_WIDTH / PITCH_W;

export function ExportFrame({ mine, opponent, zoneName, tokens, ball, tokenPx }: ExportFrameProps) {
  const scale = { ppu: PPU, tokenPx, hitPx: tokenPx };
  return (
    <div className={styles.frame} style={{ width: EXPORT_WIDTH, height: EXPORT_HEIGHT }}>
      <div className={styles.head}>
        <div className={styles.teams}>
          <TeamMark team="mine" size={20} />
          <span>{mine}</span>
          {opponent ? (
            <>
              <span className={styles.versus}>v</span>
              <TeamMark team="opp" size={20} />
              <span>{opponent}</span>
            </>
          ) : null}
        </div>
        {zoneName ? <p className={styles.zone}>{zoneName}</p> : null}
      </div>
      <Pitch
        label={PITCH_LABEL}
        style={{ width: PITCH_WIDTH, height: EXPORT_PITCH_HEIGHT, flex: 'none' }}
      >
        {tokens.map((token) => (
          <PlayerToken
            key={token.id}
            x={token.x}
            y={token.y}
            scale={scale}
            team={token.team}
            keeper={token.keeper}
            label={token.label}
            side={token.side}
            role={token.role}
            showRole={Boolean(token.role)}
            fixed
          />
        ))}
        {ball ? <Ball x={ball.x} y={ball.y} scale={scale} fixed /> : null}
      </Pitch>
      <p className={styles.footer}>{EXPORT_FOOTER}</p>
    </div>
  );
}
