import { describe, expect, it } from 'vitest';
import { buildSessionLogDocument } from './sessionLogDocument';

const TEMPLATE = [
  'int square(int x) {',
  '%slot s1%',
  '    return 0.0f;',
  '%endslot s1%',
  '    int r = 0;',
  '%slot s2%',
  '    // Enter your code below:',
  '%endslot s2%',
  '    return r;',
  '}'
].join('\n');

const BASE_CODE = [
  'int square(int x) {',
  '    return 0.0f;',
  '    int r = 0;',
  '    // Enter your code below:',
  '    return r;',
  '}'
].join('\n');

describe('buildSessionLogDocument', () => {
  it('assembles the template with its own slot contents as the fresh attempt', () => {
    const document = buildSessionLogDocument({ starterCode: TEMPLATE, usesSlots: true, sections: {} });

    expect(document.usesSlots).toBe(true);
    expect(document.template).toBe(TEMPLATE);
    expect(document.baseCode).toBe(BASE_CODE);
    expect(document.baseCode).not.toContain('%slot');
    expect(document.slots).toEqual([
      { label: 's1', range: [2, 1, 2, 17], code: '    return 0.0f;', savedCode: '    return 0.0f;' },
      {
        label: 's2',
        range: [4, 1, 4, 30],
        code: '    // Enter your code below:',
        savedCode: '    // Enter your code below:'
      }
    ]);
  });

  it('splices the saved sections into the saved document and leaves the base alone', () => {
    const document = buildSessionLogDocument({
      starterCode: TEMPLATE,
      usesSlots: true,
      sections: { s1: '    return 42;', s2: '    return r * r;' }
    });

    expect(document.baseCode).toBe(BASE_CODE);
    expect(document.savedCode).toBe(
      ['int square(int x) {', '    return 42;', '    int r = 0;', '    return r * r;', '    return r;', '}'].join('\n')
    );
    expect(document.slots.map((slot) => slot.savedCode)).toEqual(['    return 42;', '    return r * r;']);
    // The template's own slot code stays readable next to the session's.
    expect(document.slots.map((slot) => slot.code)).toEqual(['    return 0.0f;', '    // Enter your code below:']);
  });

  it('keeps a slot the session never saved at its template code', () => {
    const document = buildSessionLogDocument({
      starterCode: TEMPLATE,
      usesSlots: true,
      sections: { s1: '    return 7;' }
    });

    expect(document.slots.map((slot) => slot.savedCode)).toEqual(['    return 7;', '    // Enter your code below:']);
    expect(document.savedCode).toContain('    return 7;\n    int r = 0;');
  });

  it('normalizes CRLF line endings in both documents', () => {
    const document = buildSessionLogDocument({
      starterCode: TEMPLATE.replaceAll('\n', '\r\n'),
      usesSlots: true,
      sections: { s1: '    return 1;\r\n' }
    });

    expect(document.baseCode).toBe(BASE_CODE);
    expect(document.baseCode).not.toContain('\r');
    expect(document.savedCode).not.toContain('\r');
  });

  it('treats a non-slot problem as the body section alone', () => {
    const document = buildSessionLogDocument({
      starterCode: '#include <stdio.h>',
      usesSlots: false,
      sections: { body: 'int main() { return 0; }', leftover: 'ignored' }
    });

    expect(document.usesSlots).toBe(false);
    expect(document.template).toBe('#include <stdio.h>');
    expect(document.baseCode).toBe('');
    expect(document.savedCode).toBe('int main() { return 0; }');
    expect(document.slots).toEqual([]);
  });

  it('reports an empty saved document when a non-slot session has no body', () => {
    const document = buildSessionLogDocument({ starterCode: 'int x;', usesSlots: false, sections: {} });

    expect(document.baseCode).toBe('');
    expect(document.savedCode).toBe('');
    expect(document.slots).toEqual([]);
  });
});
