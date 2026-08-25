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

  it('rejects non-finite numbers, bigint, and functions', () => {
    expect(() => toJsonValue({ v: Number.NaN } as never)).toThrow('non-finite');
    expect(() => toJsonValue({ v: Infinity } as never)).toThrow('non-finite');
    expect(() => toJsonValue({ v: 1n } as never)).toThrow('BigInt');
    expect(() => toJsonValue({ f: () => {} } as never)).toThrow('cannot convert function');
  });

  it('omits undefined object members and maps them to null in arrays', () => {
    expect(toJsonValue({ a: undefined, b: 1 } as never)).toEqual({ b: 1 });
    expect(toJsonValue([1, undefined, 2] as never)).toEqual([1, null, 2]);
  });

  it('rejects circular references', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => toJsonValue(circular as never)).toThrow('circular');
  });

  it('passes through shared (non-circular) object references', () => {
    const shared = { v: 1 };
    expect(toJsonValue({ a: shared, b: shared } as never)).toEqual({ a: { v: 1 }, b: { v: 1 } });
  });
});
