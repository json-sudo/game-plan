import { decodeShareHash, SHARE_PARAM, type DecodeResult } from './codec';

export function readShareFromLocation(location: Location = window.location): DecodeResult | null {
  if (!location.hash.startsWith(`#${SHARE_PARAM}=`)) return null;
  return decodeShareHash(location.hash);
}

export function clearShareHash(win: Pick<Window, 'history' | 'location'> = window): void {
  const { pathname, search } = win.location;
  win.history.replaceState(null, '', `${pathname}${search}`);
}
