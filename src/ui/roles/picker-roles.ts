import { FM26_DATA } from '../../data/fm26';
import { targetFor } from '../../engine';
import type { PitchDocument, Player } from '../../state/document';
import { roleOptions } from '../setup/setup-model';
import type { RolePickerRole } from './RolePicker';

function roleMovement(doc: PitchDocument, player: Player, roleId: string) {
  const from = player.base ?? { x: 0, y: 0 };
  if (!doc.scenario || !player.base) return { from, to: from };
  const result = targetFor({
    base: player.base,
    start: player.base,
    team: player.team,
    attacker: doc.attacker,
    roleId,
    isKeeper: player.isKeeper,
    zone: doc.scenario.zone,
    tables: {
      movement: FM26_DATA.movement,
      shapeLineShift: FM26_DATA.shapeLineShift,
      lineShift: FM26_DATA.lineShift,
    },
  });
  return { from, to: result.status === 'ok' ? result.target : from };
}

export function pickerRoles(doc: PitchDocument, player: Player): RolePickerRole[] {
  return roleOptions(doc, player).map((role) => ({
    id: role.id,
    name: role.name,
    desc: role.description,
    ...roleMovement(doc, player, role.id),
  }));
}
