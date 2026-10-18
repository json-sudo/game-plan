import {
  isFirstVisit,
  loadTactics,
  pickAutoLoadSlot,
  type LoadTacticsResult,
} from '../../persistence';
import { readShareFromLocation, type DecodeResult } from '../../share';
import type { Phase } from '../../engine';
import { createExampleTactic, createInitialTactic, type Mode, type Tactic } from '../../state';

export type SessionVisit = 'first' | 'returning' | 'shared';

export type SessionShareFeedback = { status: 'none' } | { status: 'error'; message: string };

export interface InitialSession {
  tactic: Tactic;
  mode: Mode;
  phase: Phase;
  visit: SessionVisit;
  tactics: LoadTacticsResult;
  share: SessionShareFeedback;
}

export interface SessionSources {
  storage?: Storage;
  location?: Pick<Location, 'hash'>;
}

function readShare(location: Pick<Location, 'hash'> | undefined): DecodeResult | null {
  return location ? readShareFromLocation(location) : null;
}

function readTactics(storage: Storage | undefined): LoadTacticsResult {
  try {
    return loadTactics(storage ?? localStorage);
  } catch {
    return { status: 'unavailable' };
  }
}

function readFirstVisit(storage: Storage | undefined): boolean {
  try {
    return isFirstVisit(storage ?? localStorage);
  } catch {
    return true;
  }
}

function autoloaded(tactics: LoadTacticsResult): Tactic | null {
  if (tactics.status !== 'ok') return null;
  return pickAutoLoadSlot(tactics.wrapper)?.tactic ?? null;
}

export function resolveInitialSession(sources: SessionSources = {}): InitialSession {
  const { storage, location = window.location } = sources;
  const tactics = readTactics(storage);
  const shared = readShare(location);
  if (shared?.status === 'ok') {
    const { tactic, mode, phase } = shared;
    return { tactic, mode, phase, visit: 'shared', tactics, share: { status: 'none' } };
  }
  const share: SessionShareFeedback = shared
    ? { status: 'error', message: shared.message }
    : { status: 'none' };
  if (readFirstVisit(storage)) {
    return {
      tactic: createExampleTactic(),
      mode: 'fm',
      phase: 'shape',
      visit: 'first',
      tactics,
      share,
    };
  }
  return {
    tactic: autoloaded(tactics) ?? createInitialTactic(),
    mode: 'openPitch',
    phase: 'shape',
    visit: 'returning',
    tactics,
    share,
  };
}
