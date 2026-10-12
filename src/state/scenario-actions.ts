import type { DataSet, Point } from '../data/types';
import type { ZoneId } from '../data/zones';
import {
  dragBall as engineDragBall,
  dribble as engineDribble,
  pass as enginePass,
  resolveCarrier,
  setCarrier as engineSetCarrier,
  tapZone as engineTapZone,
  zoneOf,
  type BallState,
  type DribbleDirection,
} from '../engine';
import { attackersOf, scenarioContextOf } from './context';
import { roundPoint, type BoardDocument } from './document';

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function withBallState(doc: BoardDocument, state: BallState): BoardDocument {
  const ball = roundPoint(state.ball);
  const scenario = state.carrierId
    ? { zone: zoneOf(ball, doc.attacker), carrierId: state.carrierId }
    : null;
  const unchanged =
    samePoint(ball, doc.ball) &&
    scenario?.zone === doc.scenario?.zone &&
    scenario?.carrierId === doc.scenario?.carrierId;
  return unchanged ? doc : { ...doc, ball, scenario };
}

export function refreshScenario(doc: BoardDocument): BoardDocument {
  if (!doc.scenario) return doc;
  const candidates = attackersOf(doc).map((player) => ({
    id: player.id,
    position: player.base!,
    isKeeper: player.isKeeper,
  }));
  const carrierId = resolveCarrier(doc.ball, candidates, doc.scenario.carrierId);
  const zone = zoneOf(doc.ball, doc.attacker);
  if (carrierId === doc.scenario.carrierId && zone === doc.scenario.zone) return doc;
  return { ...doc, scenario: carrierId ? { zone, carrierId } : null };
}

export function tapZone(doc: BoardDocument, zone: ZoneId, data: DataSet): BoardDocument {
  return withBallState(doc, engineTapZone(scenarioContextOf(doc, data), zone));
}

export function dragBall(doc: BoardDocument, point: Point, data: DataSet): BoardDocument {
  return withBallState(doc, engineDragBall(scenarioContextOf(doc, data), point));
}

export function setCarrier(doc: BoardDocument, playerId: string, data: DataSet): BoardDocument {
  return withBallState(doc, engineSetCarrier(scenarioContextOf(doc, data), playerId));
}

export function pass(
  doc: BoardDocument,
  receiverId: string,
  positions: ReadonlyMap<string, Point> | undefined,
  data: DataSet,
): BoardDocument {
  return withBallState(doc, enginePass(scenarioContextOf(doc, data), receiverId, positions));
}

export function dribble(
  doc: BoardDocument,
  direction: DribbleDirection,
  data: DataSet,
): BoardDocument {
  return withBallState(doc, engineDribble(scenarioContextOf(doc, data), direction));
}

export function clearScenario(doc: BoardDocument): BoardDocument {
  return doc.scenario ? { ...doc, scenario: null } : doc;
}
