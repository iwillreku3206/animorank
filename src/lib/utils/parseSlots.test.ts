import { describe, expect, it } from 'vitest';
import { parseSlots } from './parseSlots';

const TEMPLATE = [
  '#include <stdio.h>',
  '',
  'int main() {',
  '%slot code%',
  '  // write your code here',
  '%endslot code%',
  '  return 0;',
  '}'
].join('\n');

/**
 * Read a slot's `initialRange` out of `fullCode` the way the constrained editor
 * does, and fail the way it does: it throws on a range that runs past the end of
 * a line or past the last line.
 */
const readRange = (fullCode: string, [startLine, startCol, endLine, endCol]: [number, number, number, number]) => {
  const lines = fullCode.split('\n');
  if (startLine > lines.length) throw new Error(`start line ${startLine} > ${lines.length} lines`);
  if (endLine > lines.length) throw new Error(`end line ${endLine} > ${lines.length} lines`);
  if (startCol > lines[startLine - 1].length + 1)
    throw new Error(`start column ${startCol} past end of line ${startLine}`);
  if (endCol > lines[endLine - 1].length + 1) throw new Error(`end column ${endCol} past end of line ${endLine}`);

  const selected = lines.slice(startLine - 1, endLine);
  selected[selected.length - 1] = selected[selected.length - 1].slice(0, endCol - 1);
  selected[0] = selected[0].slice(startCol - 1);
  return selected.join('\n');
};

describe('parseSlots', () => {
  it('strips the markers and keeps the surrounding template', () => {
    const { fullCode } = parseSlots(TEMPLATE);
    expect(fullCode).toBe(
      ['#include <stdio.h>', '', 'int main() {', '  // write your code here', '  return 0;', '}'].join('\n')
    );
  });

  it('substitutes saved code for the default slot content', () => {
    const { fullCode } = parseSlots(TEMPLATE, { code: '  int x = 5;\n  printf("%d", x);' });
    expect(fullCode).toBe(
      ['#include <stdio.h>', '', 'int main() {', '  int x = 5;', '  printf("%d", x);', '  return 0;', '}'].join('\n')
    );
  });

  // Regression: the solve view used to take its text from parseSlots(template,
  // savedCode) but its ranges from parseSlots(template). The two only agree
  // while the slots still hold their default content, so the first refresh
  // after a save handed the constrained editor an out-of-bounds range. That
  // throw dropped every restriction and the listener behind autosave, leaving
  // the whole file editable and saving broken.
  describe.each([
    ['no saved code', undefined],
    ['a shorter single line', { code: '  int x = 5;' }],
    ['more lines than the default', { code: '  int x = 5;\n  printf("%d", x);' }],
    ['an emptied slot', { code: '' }],
    ['a trailing blank line', { code: 'a();\n' }],
    ['a longer line than the default', { code: '  printf("a rather long line indeed %d\\n", 1);' }]
  ])('slot ranges with %s', (_label, saved) => {
    it('address exactly that slot’s code inside fullCode', () => {
      const { fullCode, sections } = parseSlots(TEMPLATE, saved);
      expect(sections).toHaveLength(1);
      for (const section of sections) {
        expect(readRange(fullCode, section.slot.initialRange)).toBe(section.code);
      }
    });
  });

  it('keeps every range addressable when several slots are filled', () => {
    const template = [
      '%slot includes%',
      '#include <stdio.h>',
      '%endslot includes%',
      '',
      'int main() {',
      '%slot body%',
      '  // here',
      '%endslot body%',
      '}'
    ].join('\n');

    const { fullCode, sections } = parseSlots(template, {
      includes: '#include <stdio.h>\n#include <stdlib.h>',
      body: '  puts("hi");'
    });

    expect(sections.map((section) => section.slot.label)).toEqual(['includes', 'body']);
    for (const section of sections) {
      expect(readRange(fullCode, section.slot.initialRange)).toBe(section.code);
    }
  });
});
