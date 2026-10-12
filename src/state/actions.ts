import { FM26_DATA } from '../data/fm26';
import type { DataSet, Point, Side } from '../data/types';
import type { ZoneId } from '../data/zones';
import type { DribbleDirection } from '../engine';
import type { BoardDocument, SquadSize } from './document';
import {
  applyFormation,
  applyMatchup,
  resetBoard,
  setKeeper,
  setSquadSize,
} from './layout-actions';
import { benchPlayer, movePlayer, renameTeam, setPieceName } from './piece-actions';
import { fillDefaultRoles, setAttacker, setRole } from './role-actions';
import { clearScenario, dragBall, dribble, pass, setCarrier, tapZone } from './scenario-actions';
import { documentIssues } from './validate';

export type Action =
  | { type: 'applyFormation'; team: Side; formationId: string }
  | { type: 'applyMatchup' }
  | { type: 'setAttacker'; attacker: Side }
  | { type: 'renameTeam'; team: Side; name: string }
  | { type: 'setSquadSize'; team: Side; size: SquadSize }
  | { type: 'setKeeper'; team: Side; keeper: boolean }
  | { type: 'setRole'; playerId: string; roleId: string | null }
  | { type: 'fillDefaultRoles' }
  | { type: 'setPieceName'; playerId: string; name: string }
  | { type: 'movePlayer'; playerId: string; point: Point }
  | { type: 'benchPlayer'; playerId: string }
  | { type: 'tapZone'; zone: ZoneId }
  | { type: 'dragBall'; point: Point }
  | { type: 'setCarrier'; playerId: string }
  | { type: 'pass'; receiverId: string; positions?: ReadonlyMap<string, Point> }
  | { type: 'dribble'; direction: DribbleDirection }
  | { type: 'clearScenario' }
  | { type: 'reset' }
  | { type: 'loadDocument'; doc: BoardDocument };

export function applyAction(
  doc: BoardDocument,
  action: Action,
  data: DataSet = FM26_DATA,
): BoardDocument {
  switch (action.type) {
    case 'applyFormation':
      return applyFormation(doc, action.team, action.formationId, data);
    case 'applyMatchup':
      return applyMatchup(doc, data);
    case 'setAttacker':
      return setAttacker(doc, action.attacker, data);
    case 'renameTeam':
      return renameTeam(doc, action.team, action.name);
    case 'setSquadSize':
      return setSquadSize(doc, action.team, action.size);
    case 'setKeeper':
      return setKeeper(doc, action.team, action.keeper, data);
    case 'setRole':
      return setRole(doc, action.playerId, action.roleId, data);
    case 'fillDefaultRoles':
      return fillDefaultRoles(doc, data);
    case 'setPieceName':
      return setPieceName(doc, action.playerId, action.name);
    case 'movePlayer':
      return movePlayer(doc, action.playerId, action.point);
    case 'benchPlayer':
      return benchPlayer(doc, action.playerId);
    case 'tapZone':
      return tapZone(doc, action.zone, data);
    case 'dragBall':
      return dragBall(doc, action.point, data);
    case 'setCarrier':
      return setCarrier(doc, action.playerId, data);
    case 'pass':
      return pass(doc, action.receiverId, action.positions, data);
    case 'dribble':
      return dribble(doc, action.direction, data);
    case 'clearScenario':
      return clearScenario(doc);
    case 'reset':
      return resetBoard(doc, data);
    case 'loadDocument':
      return documentIssues(action.doc, data) === null ? action.doc : doc;
  }
}
