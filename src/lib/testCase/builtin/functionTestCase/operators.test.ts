import { describe, expect, it } from 'vitest';
import { OperatorRegistry } from './operatorRegistry';
import { LessThanOperator } from './operators/less_than';
import { LessThanEqualOperator } from './operators/less_than_equal';
import { GreaterThanOperator } from './operators/greater_than';
import { GreaterThanEqualOperator } from './operators/greater_than_equal';
import { EqualOperator } from './operators/equal';
import { NotEqualOperator } from './operators/not_equal';
import { WithinRangeOperator } from './operators/within_range';
import { Integer } from './types/int';
import { Float } from './types/float';
import { StringType } from './types/string';
import { Pointer } from './types/pointer';
import { TypeValue } from './typeValue.svelte';

describe('OperatorRegistry', () => {
  it('registers all old operators with snake_case ids', () => {
    expect([...OperatorRegistry.instance().keys()].sort()).toEqual([
      'equal',
      'greater_than',
      'greater_than_equal',
      'less_than',
      'less_than_equal',
      'not_equal',
      'within_range'
    ]);
  });
});

describe('operators', () => {
  const int = (value: string) => new TypeValue(Integer.create(), { value });
  const float = (value: string) => new TypeValue(Float.create(), { value });
  const string = (value: string) => new TypeValue(StringType.create(), { value });
  const pointer = (value: string) => new TypeValue(new Pointer({ target: 'int' }), { value });

  it('less_than passes when the actual value is below the expected value', () => {
    const op = LessThanOperator.create();
    expect(op.compare(int('5'), int('4'))).toBe(true); // actual 4 < expected 5
    expect(op.compare(float('2.5'), float('1.5'))).toBe(true);
    expect(op.compare(int('3'), int('4'))).toBe(false); // actual 4 < expected 3
    expect(op.compare(int('4'), int('4'))).toBe(false); // strict: equal is not less
  });

  it('less_than_equal passes when the actual value is at most the expected value', () => {
    const op = LessThanEqualOperator.create();
    expect(op.compare(int('4'), int('4'))).toBe(true);
    expect(op.compare(float('2.5'), float('2.5'))).toBe(true);
    expect(op.compare(int('3'), int('4'))).toBe(false); // actual 4 <= expected 3
  });

  it('greater_than passes when the actual value is above the expected value', () => {
    const gt = GreaterThanOperator.create();
    expect(gt.compare(int('4'), int('5'))).toBe(true); // actual 5 > expected 4
    expect(gt.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(gt.compare(int('5'), int('4'))).toBe(false);
    expect(gt.compare(int('4'), int('4'))).toBe(false); // strict: equal is not greater
  });

  it('greater_than_equal passes when the actual value is at least the expected value', () => {
    const gte = GreaterThanEqualOperator.create();
    expect(gte.compare(int('4'), int('4'))).toBe(true);
    expect(gte.compare(float('1.5'), float('1.5'))).toBe(true);
    expect(gte.compare(int('5'), int('4'))).toBe(false); // actual 4 >= expected 5
  });

  it('rejects string operands for numeric-only operators; pointers delegate by dereference', () => {
    const operators = [
      LessThanOperator.create(),
      LessThanEqualOperator.create(),
      GreaterThanOperator.create(),
      GreaterThanEqualOperator.create(),
      new WithinRangeOperator({ range: '2' })
    ];
    for (const op of operators) {
      expect(() => op.compare(string('a'), string('b'))).toThrow();
    }

    // Legacy supported relational comparisons on pointers by dereferencing
    // the target type; the delegation lives in the pointer operator types.
    const pointer = (v: string) => new TypeValue(new Pointer({ target: 'int' }), { value: v });
    expect(LessThanOperator.create().compare(pointer('5'), pointer('3'))).toBe(true); // actual 3 < expected 5
    expect(LessThanOperator.create().compare(pointer('3'), pointer('5'))).toBe(false);
    expect(LessThanEqualOperator.create().compare(pointer('4'), pointer('4'))).toBe(true);
    expect(GreaterThanOperator.create().compare(pointer('4'), pointer('5'))).toBe(true);
    expect(new WithinRangeOperator({ range: '2' }).compare(pointer('4'), pointer('5'))).toBe(true);
    expect(new WithinRangeOperator({ range: '2' }).compare(pointer('4'), pointer('7'))).toBe(false);
  });

  it('equal and not_equal compare int, float, string, pointer', () => {
    const eq = EqualOperator.create();
    const ne = NotEqualOperator.create();
    expect(eq.compare(int('4'), int('4'))).toBe(true);
    expect(eq.compare(float('1.5'), float('1.5'))).toBe(true);
    expect(eq.compare(string('a'), string('a'))).toBe(true);
    expect(eq.compare(pointer('4'), pointer('4'))).toBe(true);
    expect(eq.compare(int('4'), int('5'))).toBe(false);
    expect(eq.compare(float('1.5'), float('2.5'))).toBe(false);
    expect(eq.compare(string('a'), string('b'))).toBe(false);
    expect(eq.compare(pointer('4'), pointer('5'))).toBe(false);
    expect(ne.compare(int('4'), int('5'))).toBe(true);
    expect(ne.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(ne.compare(string('a'), string('b'))).toBe(true);
    expect(ne.compare(pointer('4'), pointer('5'))).toBe(true);
    // not_equal must NOT pass on equal values (constant-true regression guard)
    expect(ne.compare(int('4'), int('4'))).toBe(false);
    expect(ne.compare(float('1.5'), float('1.5'))).toBe(false);
    expect(ne.compare(string('a'), string('a'))).toBe(false);
    expect(ne.compare(pointer('4'), pointer('4'))).toBe(false);
  });

  it('within_range compares with the range option, strictly', () => {
    const op = new WithinRangeOperator({ range: '2' });
    expect(op.compare(int('4'), int('5'))).toBe(true);
    expect(op.compare(int('4'), int('7'))).toBe(false);
    expect(op.compare(int('4'), int('6'))).toBe(false); // |6-4| == range is NOT within
    expect(op.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(op.compare(float('1.5'), float('4'))).toBe(false);
  });

  it('rejects non-numeric and negative within_range ranges at parse', () => {
    expect(() => new WithinRangeOperator({ range: 'abc' })).toThrow(/non-negative number/);
    expect(() => new WithinRangeOperator({ range: '-1' })).toThrow(/non-negative number/);
    expect(() => new WithinRangeOperator({ range: '1e3' })).toThrow(/non-negative number/);
  });

  it('rejects fractional ranges for integer comparisons with a clear error', () => {
    const op = new WithinRangeOperator({ range: '2.5' });
    expect(() => op.compare(int('4'), int('5'))).toThrow(/whole-number range/);
    // float comparisons still accept fractional ranges
    expect(op.compare(float('1.5'), float('2.5'))).toBe(true);
  });

  it('exposes an options form only for operators with settings', () => {
    expect(new WithinRangeOperator({ range: '2' }).optionsForm).not.toBeNull();
    expect(EqualOperator.create().optionsForm).toBeNull();
    expect(LessThanOperator.create().optionsForm).toBeNull();
  });

  it('normalizes within_range options to the default range when missing', () => {
    expect(new WithinRangeOperator({ range: '3' }).options).toEqual({ range: '3' });
    expect(new WithinRangeOperator(null).options).toEqual({ range: '0' });
    expect(new WithinRangeOperator({}).options).toEqual({ range: '0' });
    // Legacy rows migrated with a NULL range_value and cleared form fields
    // must hydrate as '0', not crash the constructor.
    expect(new WithinRangeOperator({ range: null }).options).toEqual({ range: '0' });
    expect(new WithinRangeOperator({ range: '' }).options).toEqual({ range: '0' });
  });

  it('round-trips operator options through the registry', () => {
    const op = new WithinRangeOperator({ range: '3' });
    const hydrated = OperatorRegistry.instance().from(op.toJSON());
    expect(hydrated.options).toEqual({ range: '3' });
    expect(hydrated.compare(int('4'), int('5'))).toBe(true);
    expect(hydrated.compare(int('4'), int('8'))).toBe(false);
  });
});
