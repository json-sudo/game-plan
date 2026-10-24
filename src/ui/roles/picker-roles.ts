import { formationAnchors, toDisplayFrame, type FmPlayer } from '../../engine';
import type { PitchDocument, Player } from '../../state/document';
import { rolesOf } from '../../state/visualization';
import { roleOptions } from '../setup/setup-model';
import type { RolePickerRole } from './RolePicker';

const keyOf = (player: Pick<Player, 'team' | 'slot'>) => `${player.team}:${player.slot}`;

function fmPlayersOf(doc: PitchDocument, picked: Player, roleId: string): FmPlayer[] {
  const roles = { ...rolesOf(doc), [keyOf(picked)]: roleId };
  return doc.players.flatMap((player) =>
    player.family && player.slot && player.base
      ? [
          {
            id: keyOf(player),
            team: player.team,
            family: player.family,
            base: player.base,
            roleId: roles[keyOf(player)],
            isKeeper: player.isKeeper,
          },
        ]
      : [],
  );
}

function roleAnchor(doc: PitchDocument, player: Player, roleId: string) {
  const from = player.base ?? { x: 0, y: 0 };
  if (!doc.scenario || !player.base) return { from, to: from };
  const anchor = formationAnchors({
    attacker: doc.attacker,
    players: fmPlayersOf(doc, player, roleId),
    zone: doc.scenario.zone,
  }).get(keyOf(player));
  return { from, to: anchor ? toDisplayFrame(anchor.point, doc.attacker) : from };
}

export function pickerRoles(doc: PitchDocument, player: Player): RolePickerRole[] {
  return roleOptions(doc, player).map((role) => ({
    id: role.id,
    name: role.name,
    desc: role.description,
    ...roleAnchor(doc, player, role.id),
  }));
}
