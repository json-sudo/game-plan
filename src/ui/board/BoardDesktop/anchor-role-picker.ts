export const PICKER_SIZE = { width: 380, height: 440 };
const GAP = 8;

export interface AnchorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function anchorRolePicker(
  token: AnchorBox,
  viewport: { width: number; height: number },
  picker: { width: number; height: number },
): { left: number; top: number } {
  const besideRight = token.left + token.width + GAP;
  const besideLeft = token.left - GAP - picker.width;
  let preferred = besideRight;
  if (besideRight + picker.width > viewport.width && besideLeft >= 0) preferred = besideLeft;
  const maxLeft = Math.max(0, viewport.width - picker.width);
  const left = Math.min(Math.max(0, preferred), maxLeft);
  const maxTop = Math.max(0, viewport.height - picker.height);
  const top = Math.min(Math.max(0, token.top), maxTop);
  return { left, top };
}
