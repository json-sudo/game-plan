import { useState } from 'react';
import { Banner } from '../ui/feedback/Banner';
import { Dialog } from '../ui/feedback/Dialog';
import { EmptyState } from '../ui/feedback/EmptyState';
import { FirstRunHint } from '../ui/feedback/FirstRunHint';
import { SlotListItem } from '../ui/feedback/SlotListItem';
import { Button } from '../ui/controls/Button';
import { ICON_NAMES, Icon } from '../ui/controls/Icon';
import { SegmentedControl } from '../ui/controls/SegmentedControl';
import { TextField } from '../ui/controls/TextField';
import { Toggle } from '../ui/controls/Toggle';
import { ChoiceGrid } from '../ui/setup/ChoiceGrid';
import { SetupStepper } from '../ui/setup/SetupStepper';
import { PhoneMenu } from '../ui/chrome/PhoneMenu';
import { TopBar } from '../ui/chrome/TopBar';
import { UndoControl } from '../ui/chrome/UndoControl';
import { MODE_OPTIONS } from '../ui/copy';
import { useTheme } from '../shared/hooks/useTheme';
import styles from './gallery.module.scss';
const FORMATIONS = [
  { label: '4-3-3 DM Wide' },
  { label: '4-2-3-1 DM Wide' },
  { label: '4-4-2 Diamond' },
  { label: 'More' },
];
const MENU_ITEMS = [
  { icon: 'reset' as const, label: 'Reset' },
  { icon: 'clear' as const, label: 'Clear' },
  'sep' as const,
  { icon: 'save' as const, label: 'Save tactic' },
  { icon: 'load' as const, label: 'Load tactic' },
  { icon: 'share' as const, label: 'Share tactic' },
];

export default function Gallery() {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('open');
  const [formation, setFormation] = useState('4-3-3 DM Wide');
  const [toggle, setToggle] = useState(true);

  return (
    <main className={styles.gallery}>
      <header className={styles.gallery__intro}>
        <div>
          <p className={styles.gallery__kicker}>Game Plan · component review</p>
          <h1>UI foundation</h1>
          <p>Chrome, controls, feedback and setup components.</p>
        </div>
        <Button variant="secondary" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={toggleTheme}>
          {theme === 'dark' ? 'Light theme' : 'Dark theme'}
        </Button>
      </header>

      <section className={styles.gallery__section} aria-labelledby="chrome-title">
        <h2 id="chrome-title">Chrome</h2>
        <div className={styles.gallery__stack}>
          <div className={styles['gallery__desktop-only']}>
            <TopBar mode={mode as 'open' | 'fm'} theme={theme} canUndo canRedo canReset />
          </div>
          <div className={styles['gallery__phone-only']}>
            <TopBar phone mode={mode as 'open' | 'fm'} canUndo />
          </div>
          <div className={styles['gallery__inline-row']}>
            <UndoControl canUndo canRedo />
            <PhoneMenu inline items={MENU_ITEMS} />
          </div>
        </div>
      </section>

      <section className={styles.gallery__section} aria-labelledby="controls-title">
        <h2 id="controls-title">Controls</h2>
        <div className={styles.gallery__stack}>
          <div className={styles['gallery__inline-row']}>
            <Button variant="primary">Next</Button>
            <Button variant="ink" icon="share">
              Share tactic
            </Button>
            <Button variant="secondary" icon="image">
              Export PNG
            </Button>
            <Button variant="ghost" icon="reset">
              Reset
            </Button>
            <Button variant="icon" icon="save" label="Save" tooltip="Save tactic" />
            <Button
              variant="secondary"
              disabled
              disabledReason="Apply a formation or matchup first."
            >
              Reset unavailable
            </Button>
          </div>
          <SegmentedControl
            label="Mode"
            showLabel
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
          />
          <div className={styles['gallery__inline-row']}>
            <Toggle label="All players" checked={toggle} onChange={setToggle} />
            <TextField
              label="Tactic name"
              value="My tactic"
              hint="Shown when you load this tactic."
            />
          </div>
          <div className={styles.gallery__icons} aria-label="Icon set">
            {ICON_NAMES.map((name) => (
              <span className={styles.gallery__icon} key={name} title={name}>
                <Icon name={name} size={24} />
                <small>{name}</small>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.gallery__section} aria-labelledby="setup-title">
        <h2 id="setup-title">Setup</h2>
        <div className={styles.gallery__columns}>
          <div className={styles.gallery__stack}>
            <ChoiceGrid
              label="My team"
              mark="mine"
              options={FORMATIONS}
              value={formation}
              onChange={setFormation}
            />
            <ChoiceGrid label="Opponent" mark="opp" options={FORMATIONS} value="4-2-3-1 DM Wide" />
          </div>
          <SetupStepper
            steps={[
              { title: 'Formations', state: 'done', summary: '4-3-3 DM Wide vs 4-2-3-1 DM Wide' },
              { title: 'Who attacks', state: 'done', summary: 'My team attacks' },
              {
                title: 'Roles',
                state: 'active',
                content: (
                  <p>
                    Every player has an FM26 default role. Tap a player on the pitch to change it.
                  </p>
                ),
              },
            ]}
          />
        </div>
      </section>

      <section className={styles.gallery__section} aria-labelledby="feedback-title">
        <h2 id="feedback-title">Feedback</h2>
        <div className={styles.gallery__columns}>
          <div className={styles.gallery__stack}>
            <Banner tone="info" title="Link copied">
              Paste it in your group chat.
            </Banner>
            <Banner tone="error" title="This share link could not be opened.">
              Your pitch has not changed.
            </Banner>
            <EmptyState title="No saved tactics yet">Save one from the top bar.</EmptyState>
            <FirstRunHint />
          </div>
          <div className={styles.gallery__stack}>
            <SlotListItem slot={1} name="My tactic" meta="FM mode · saved 10 Oct, 21:14" selected />
            <SlotListItem slot={2} empty />
            <Dialog
              inline
              title="Save tactic"
              footer={
                <>
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="primary">Save to slot 1</Button>
                </>
              }
            >
              <TextField label="Name" value="My tactic" />
              <p>Saving to slot 1 replaces what is there.</p>
            </Dialog>
          </div>
        </div>
      </section>
    </main>
  );
}
