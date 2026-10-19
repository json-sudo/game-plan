import type { DataSet } from '../data/types';
import { SIDES, keeperOf, type PitchDocument } from './document';
import type { Tactic } from './tactic';
import { documentIssues } from './validate';

function openPitchIssue(doc: PitchDocument): string | null {
  if (doc.players.some((player) => player.role !== undefined)) {
    return 'open pitch pieces have no roles';
  }
  return doc.scenario === null ? null : 'open pitch has no scenario';
}

function rosterIssue(tactic: Tactic): string | null {
  const { openPitch, fm } = tactic;
  for (const side of SIDES) {
    if (openPitch.teams[side].name !== fm.teams[side].name) return `${side} team names differ`;
    if (openPitch.teams[side].squadSize !== fm.teams[side].squadSize) {
      return `${side} squad sizes differ`;
    }
  }
  for (const layout of [openPitch, fm]) {
    for (const side of SIDES) {
      const count = layout.players.filter((player) => player.team === side).length;
      if (count !== layout.teams[side].squadSize) return `${side} squad does not match its size`;
    }
  }
  const fmPlayers = new Map(fm.players.map((player) => [player.id, player]));
  const mismatch = openPitch.players.find((player) => {
    const peer = fmPlayers.get(player.id);
    return !peer || peer.team !== player.team || peer.customName !== player.customName;
  });
  if (mismatch) return `${mismatch.id} is not the same player in each layout`;
  for (const side of SIDES) {
    const open = keeperOf(openPitch, side);
    const fmKeeper = keeperOf(fm, side);
    if (open && fmKeeper && open.id !== fmKeeper.id)
      return `${side} keeper differs between layouts`;
  }
  return null;
}

export function tacticIssues(tactic: Tactic, data: DataSet): string | null {
  const open = documentIssues(tactic.openPitch, data);
  if (open) return `open pitch: ${open}`;
  const fm = documentIssues(tactic.fm, data);
  if (fm) return `fm: ${fm}`;
  return openPitchIssue(tactic.openPitch) ?? rosterIssue(tactic);
}
