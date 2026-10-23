import type { TacticSnapshot } from '../state';
import { encodeShareHash } from './codec';

export type ShareLinkResult = { status: 'ok'; url: string } | { status: 'error'; message: string };

export function buildShareLink(
  snapshot: TacticSnapshot,
  location: Pick<Location, 'origin' | 'pathname' | 'search'> = window.location,
): ShareLinkResult {
  const encoded = encodeShareHash(snapshot);
  if (encoded.status === 'error') return { status: 'error', message: encoded.message };
  return {
    status: 'ok',
    url: `${location.origin}${location.pathname}${location.search}${encoded.hash}`,
  };
}
