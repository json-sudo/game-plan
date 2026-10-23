import type { Point } from '../data/types';
import type { ZoneId } from '../data/zones';
import { zoneCentre, zoneOf } from '../engine';
import { clampToPitch, roundPoint, type PitchDocument } from './document';

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function refreshScenario(doc: PitchDocument): PitchDocument {
  if (!doc.scenario) return doc;
  const zone = zoneOf(doc.ball, doc.attacker);
  return zone === doc.scenario.zone ? doc : { ...doc, scenario: { zone } };
}

export function tapZone(doc: PitchDocument, zone: ZoneId): PitchDocument {
  const ball = roundPoint(zoneCentre(zone, doc.attacker));
  if (samePoint(ball, doc.ball) && doc.scenario?.zone === zone) return doc;
  return { ...doc, ball, scenario: { zone } };
}

export function placeBall(doc: PitchDocument, point: Point): PitchDocument {
  const ball = clampToPitch(point);
  if (samePoint(ball, doc.ball) && doc.scenario === null) return doc;
  return { ...doc, ball, scenario: null };
}

export function clearScenario(doc: PitchDocument): PitchDocument {
  return doc.scenario ? { ...doc, scenario: null } : doc;
}
