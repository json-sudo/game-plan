import {
  isFirstVisit,
  loadTactics,
  pickAutoLoadSlot,
  skippedTacticsMessage,
  type LoadTacticsResult,
} from '../../persistence';
import { readShareFromLocation, type DecodeResult } from '../../share';
import type { Phase } from '../../engine';
import { createExampleTactic, createInitialTactic, type Mode, type Tactic } from '../../state';
import {
  SAVED_TACTICS_UNREADABLE_BODY,
  SAVED_TACTICS_UNREADABLE_TITLE,
  STORAGE_UNAVAILABLE_BODY,
  STORAGE_UNAVAILABLE_TITLE,
} from '../copy';

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

export interface SessionNotice {
  id: 'share' | 'storage' | 'saved';
  tone: 'error' | 'info';
  title: string;
  body?: string;
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

function tacticsNotice(tactics: LoadTacticsResult): SessionNotice | null {
  if (tactics.status === 'unavailable') {
    return {
      id: 'storage',
      tone: 'info',
      title: STORAGE_UNAVAILABLE_TITLE,
      body: STORAGE_UNAVAILABLE_BODY,
    };
  }
  if (tactics.status === 'corrupt') {
    return {
      id: 'saved',
      tone: 'error',
      title: SAVED_TACTICS_UNREADABLE_TITLE,
      body: SAVED_TACTICS_UNREADABLE_BODY,
    };
  }
  const skipped = tactics.status === 'ok' ? skippedTacticsMessage(tactics.skipped) : null;
  return skipped ? { id: 'saved', tone: 'error', title: skipped } : null;
}

export function sessionNotices(session: InitialSession): SessionNotice[] {
  const share: SessionNotice | null =
    session.share.status === 'error'
      ? { id: 'share', tone: 'error', title: session.share.message }
      : null;
  return [share, tacticsNotice(session.tactics)].filter(
    (notice): notice is SessionNotice => notice !== null,
  );
}

export function openedShareLink(session: InitialSession): boolean {
  return session.visit === 'shared' || session.share.status === 'error';
}
