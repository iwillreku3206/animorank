import { describe, expect, it } from 'vitest';
import { toJsonValue } from './utils';

class WithToJSON {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  toJSON() {
    return { nested: { value: this.value } };
  }
}

class NestedToJSON {
  toJSON() {
    return { inner: new WithToJSON(5) };
  }
}

describe('toJsonValue', () => {
  it('recursively converts objects exposing toJSON', () => {
    expect(toJsonValue({ items: [new NestedToJSON() as never] })).toEqual({
      items: [{ inner: { nested: { value: 5 } } }]
    });
  });

  it('passes through primitives, arrays and plain objects', () => {
    expect(toJsonValue({ a: [1, 'x', true, null], b: { c: 2.5 } })).toEqual({
      a: [1, 'x', true, null],
      b: { c: 2.5 }
    });
  });

  it('rejects non-POJO values without toJSON', () => {
    expect(() => toJsonValue({ map: new Map() as never })).toThrow('non-POJO');
  });
});
