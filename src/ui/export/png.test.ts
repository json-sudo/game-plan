import { afterEach, describe, expect, it } from 'vitest';
import { styledLightClone } from './png';

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('styledLightClone', () => {
  it('copies computed styles to the clone and restores the theme', () => {
    document.documentElement.dataset.theme = 'dark';
    const node = document.createElement('div');
    node.style.color = 'rgb(1, 2, 3)';
    node.innerHTML = '<span style="width: 5px">x</span>';
    document.body.appendChild(node);
    const copy = styledLightClone(node);
    expect(copy.getAttribute('style')).toContain('color:rgb(1, 2, 3)');
    expect(copy.firstElementChild?.getAttribute('style')).toContain('width:5px');
    expect(copy.getAttribute('xmlns')).toBe('http://www.w3.org/1999/xhtml');
    expect(document.documentElement.dataset.theme).toBe('dark');
    node.remove();
  });
});
