import { MODE_LABELS, MODE_OPTIONS, RESET_DISABLED_REASON, type PitchMode } from '../../copy';
import { Button } from '../../controls/Button';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { TeamMark } from '../../controls/TeamMark';
import { TextField } from '../../controls/TextField';
import { UndoControl } from '../UndoControl';
import styles from './top-bar.module.scss';

export interface TopBarProps {
  mine?: string;
  opp?: string;
  mode?: PitchMode;
  canUndo?: boolean;
  canRedo?: boolean;
  canReset?: boolean;
  theme?: 'light' | 'dark';
  phone?: boolean;
  menuOpen?: boolean;
  showResetTip?: boolean;
  undoLabel?: string;
  redo?: boolean;
  onMineChange?: (name: string) => void;
  onOppChange?: (name: string) => void;
  onModeChange?: (mode: PitchMode) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onReset?: () => void;
  onClear?: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  onCopyJson?: () => void;
  onToggleTheme?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onMenu?: () => void;
}

const SWATCH_SIZE = 12;
const SHARE_LABEL = 'Share tactic';

function PhoneTopBar(props: TopBarProps) {
  const { mine = 'My team', opp = 'Opponent', mode = 'open', canUndo, menuOpen } = props;
  return (
    <header className={styles.bar} data-phone="true">
      <div className={styles.heading}>
        <div className={styles.title}>
          {mine} v {opp}
        </div>
        <div className={styles.sub}>{MODE_LABELS[mode]}</div>
      </div>
      <Button
        variant="icon"
        icon="undo"
        label="Undo"
        disabled={!canUndo}
        disabledReason={canUndo ? undefined : 'Nothing to undo yet.'}
        tipPlacement="bottom"
        onClick={props.onUndo}
      />
      <Button variant="icon" icon="share" label={SHARE_LABEL} onClick={props.onShare} />
      <Button variant="icon" icon="menu" label="Menu" pressed={menuOpen} onClick={props.onMenu} />
    </header>
  );
}

export function TopBar(props: TopBarProps) {
  if (props.phone) return <PhoneTopBar {...props} />;
  const {
    mine = 'My team',
    opp = 'Opponent',
    mode = 'open',
    canUndo,
    canRedo,
    canReset,
    theme = 'light',
  } = props;
  const nextTheme = theme === 'dark' ? 'Light theme' : 'Dark theme';

  return (
    <header className={styles.bar}>
      <div className={styles.teams}>
        <TeamMark team="mine" size={SWATCH_SIZE} />
        <TextField
          variant="team"
          label="My team name"
          hideLabel
          value={mine}
          counter={false}
          width={150}
          readOnly={!props.onMineChange}
          onChange={props.onMineChange}
        />
        <span className={styles.versus}>v</span>
        <TeamMark team="opp" size={SWATCH_SIZE} />
        <TextField
          variant="team"
          label="Opponent name"
          hideLabel
          value={opp}
          counter={false}
          width={150}
          readOnly={!props.onOppChange}
          onChange={props.onOppChange}
        />
      </div>
      {props.onModeChange ? (
        <SegmentedControl
          label="Mode"
          value={mode}
          options={MODE_OPTIONS}
          onChange={(value) => props.onModeChange?.(value as PitchMode)}
        />
      ) : (
        <span className={styles.mode}>{MODE_LABELS[mode]}</span>
      )}
      <div className={styles.spacer} />
      <UndoControl
        canUndo={canUndo}
        canRedo={canRedo}
        undoLabel={props.undoLabel}
        redo={props.redo}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
      />
      <span className={styles.separator} />
      <div className={styles.group}>
        <Button
          variant="ghost"
          icon="reset"
          disabled={!canReset}
          disabledReason={canReset ? undefined : RESET_DISABLED_REASON}
          tipOpen={props.showResetTip}
          onClick={props.onReset}
        >
          Reset
        </Button>
        <Button variant="ghost" icon="clear" onClick={props.onClear}>
          Clear
        </Button>
      </div>
      <span className={styles.separator} />
      <div className={styles.group}>
        <Button variant="icon" icon="save" label="Save" onClick={props.onSave} />
        <Button variant="icon" icon="load" label="Load" onClick={props.onLoad} />
        <Button variant="icon" icon="copy" label="Copy tactic JSON" onClick={props.onCopyJson} />
        <Button
          variant="icon"
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={nextTheme}
          onClick={props.onToggleTheme}
        />
      </div>
      <Button variant="secondary" icon="image" onClick={props.onExport}>
        Export PNG
      </Button>
      <Button variant="ink" icon="share" onClick={props.onShare}>
        {SHARE_LABEL}
      </Button>
    </header>
  );
}
