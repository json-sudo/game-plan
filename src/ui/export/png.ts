const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS = 'http://www.w3.org/2000/svg';

function inlineStyles(source: Element, copy: Element): void {
  const computed = getComputedStyle(source);
  const declarations = Array.from(computed, (name) => `${name}:${computed.getPropertyValue(name)}`);
  copy.setAttribute('style', declarations.join(';'));
  Array.from(source.children).forEach((child, index) => inlineStyles(child, copy.children[index]));
}

export function styledLightClone(node: HTMLElement): HTMLElement {
  const root = document.documentElement;
  const previous = root.dataset.theme;
  root.dataset.theme = 'light';
  try {
    const copy = node.cloneNode(true) as HTMLElement;
    inlineStyles(node, copy);
    copy.setAttribute('xmlns', XHTML_NS);
    return copy;
  } finally {
    if (previous === undefined) delete root.dataset.theme;
    else root.dataset.theme = previous;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image could not be drawn.'));
    image.src = url;
  });
}

export async function renderPng(node: HTMLElement, width: number, height: number): Promise<Blob> {
  const copy = styledLightClone(node);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  const foreign = document.createElementNS(SVG_NS, 'foreignObject');
  foreign.setAttribute('width', '100%');
  foreign.setAttribute('height', '100%');
  foreign.appendChild(copy);
  svg.appendChild(foreign);
  const markup = new XMLSerializer().serializeToString(svg);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be saved.'))),
      'image/png',
    ),
  );
}
