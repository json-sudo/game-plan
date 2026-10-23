import {
  CLEAR_LABEL,
  EXPORT_FM_TOOLTIP,
  EXPORT_PNG_LABEL,
  MODE_LABELS,
  MODE_OPTIONS,
  RESET_DISABLED_REASON,
  RESET_LABEL,
  SHARE_FM_TOOLTIP,
  SHARE_LABEL,
  type PitchMode,
} from '../../copy';
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
  resetReason?: string;
  canClear?: boolean;
  clearReason?: string;
  theme?: 'light' | 'dark';
  phone?: boolean;
  compact?: boolean;
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
const TEAM_FIELD_WIDTH = 150;
const TEAM_FIELD_WIDTH_COMPACT = 128;

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

function ghostAction(
  compact: boolean,
  label: string,
  icon: 'reset' | 'clear',
  rest: {
    disabled?: boolean;
    disabledReason?: string;
    tipOpen?: boolean;
    onClick?: () => void;
  },
) {
  return compact ? (
    <Button variant="icon" icon={icon} label={label} {...rest} />
  ) : (
    <Button variant="ghost" icon={icon} {...rest}>
      {label}
    </Button>
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
    canClear = true,
    compact = false,
    theme = 'light',
  } = props;
  const nextTheme = theme === 'dark' ? 'Light theme' : 'Dark theme';
  const fm = mode === 'fm';
  const fieldWidth = compact ? TEAM_FIELD_WIDTH_COMPACT : TEAM_FIELD_WIDTH;

  const hasUtilities = Boolean(
    props.onSave || props.onLoad || props.onCopyJson || props.onToggleTheme,
  );

  return (
    <header className={styles.bar} data-compact={compact || undefined}>
      <div className={styles.teams}>
        <TeamMark team="mine" size={SWATCH_SIZE} />
        <TextField
          variant="team"
          label="My team name"
          hideLabel
          value={mine}
          counter={false}
          width={fieldWidth}
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
          width={fieldWidth}
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
        {ghostAction(compact, RESET_LABEL, 'reset', {
          disabled: !canReset,
          disabledReason: canReset ? undefined : (props.resetReason ?? RESET_DISABLED_REASON),
          tipOpen: props.showResetTip,
          onClick: props.onReset,
        })}
        {ghostAction(compact, CLEAR_LABEL, 'clear', {
          disabled: !canClear,
          disabledReason: canClear ? undefined : props.clearReason,
          onClick: props.onClear,
        })}
      </div>
      {hasUtilities ? (
        <>
          <span className={styles.separator} />
          <div className={styles.group}>
            {props.onSave ? (
              <Button variant="icon" icon="save" label="Save" onClick={props.onSave} />
            ) : null}
            {props.onLoad ? (
              <Button variant="icon" icon="load" label="Load" onClick={props.onLoad} />
            ) : null}
            {props.onCopyJson ? (
              <Button
                variant="icon"
                icon="copy"
                label="Copy tactic JSON"
                onClick={props.onCopyJson}
              />
            ) : null}
            {props.onToggleTheme ? (
              <Button
                variant="icon"
                icon={theme === 'dark' ? 'sun' : 'moon'}
                label={nextTheme}
                onClick={props.onToggleTheme}
              />
            ) : null}
          </div>
        </>
      ) : null}
      {compact ? (
        <Button
          variant="icon"
          icon="image"
          label={EXPORT_PNG_LABEL}
          tooltip={fm ? EXPORT_FM_TOOLTIP : undefined}
          onClick={props.onExport}
        />
      ) : (
        <Button
          variant="secondary"
          icon="image"
          tooltip={fm ? EXPORT_FM_TOOLTIP : undefined}
          onClick={props.onExport}
        >
          {EXPORT_PNG_LABEL}
        </Button>
      )}
      <Button
        variant="ink"
        icon="share"
        tooltip={fm ? SHARE_FM_TOOLTIP : undefined}
        onClick={props.onShare}
      >
        {SHARE_LABEL}
      </Button>
    </header>
  );
}
