import type { DataSet, Point } from '../data/types';
import type { ZoneId } from '../data/zones';
import {
  dribble as engineDribble,
  pass as enginePass,
  setCarrier as engineSetCarrier,
  tapZone as engineTapZone,
  zoneOf,
  type BallState,
  type DribbleDirection,
} from '../engine';
import { attackersOf, scenarioContextOf } from './context';
import { eligibleCarrierIdsOf } from './eligible-carriers';
import { clampToPitch, roundPoint, type PitchDocument } from './document';

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function withBallState(doc: PitchDocument, state: BallState): PitchDocument {
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

export function refreshScenario(doc: PitchDocument): PitchDocument {
  if (!doc.scenario) return doc;
  const carrierId = doc.scenario.carrierId;
  if (!attackersOf(doc).some((player) => player.id === carrierId))
    return { ...doc, scenario: null };
  const zone = zoneOf(doc.ball, doc.attacker);
  return zone === doc.scenario.zone ? doc : { ...doc, scenario: { zone, carrierId } };
}

export function recheckCarrier(doc: PitchDocument, data: DataSet): PitchDocument {
  const refreshed = refreshScenario(doc);
  if (!refreshed.scenario) return refreshed;
  const { zone, carrierId } = refreshed.scenario;
  return eligibleCarrierIdsOf(refreshed, zone, data).includes(carrierId)
    ? refreshed
    : { ...refreshed, scenario: null };
}

export function tapZone(doc: PitchDocument, zone: ZoneId, data: DataSet): PitchDocument {
  const eligible = eligibleCarrierIdsOf(doc, zone, data);
  return withBallState(doc, engineTapZone(scenarioContextOf(doc, data), zone, eligible));
}

export function placeBall(doc: PitchDocument, point: Point): PitchDocument {
  const ball = clampToPitch(point);
  if (samePoint(ball, doc.ball) && doc.scenario === null) return doc;
  return { ...doc, ball, scenario: null };
}

export function setCarrier(doc: PitchDocument, playerId: string, data: DataSet): PitchDocument {
  const eligible = eligibleCarrierIdsOf(doc, zoneOf(doc.ball, doc.attacker), data);
  return withBallState(doc, engineSetCarrier(scenarioContextOf(doc, data), playerId, eligible));
}

export function pass(
  doc: PitchDocument,
  receiverId: string,
  positions: ReadonlyMap<string, Point> | undefined,
  data: DataSet,
): PitchDocument {
  return withBallState(doc, enginePass(scenarioContextOf(doc, data), receiverId, positions));
}

export function dribble(
  doc: PitchDocument,
  direction: DribbleDirection,
  data: DataSet,
): PitchDocument {
  return withBallState(doc, engineDribble(scenarioContextOf(doc, data), direction));
}

export function clearScenario(doc: PitchDocument): PitchDocument {
  return doc.scenario ? { ...doc, scenario: null } : doc;
}
