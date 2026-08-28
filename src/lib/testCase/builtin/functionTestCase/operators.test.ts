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
    expect([...new OperatorRegistry().keys()].sort()).toEqual([
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
  const pointer = async (value: string) => new TypeValue(await Pointer.from({ target: 'int' }), { value });

  it('less_than passes when the actual value is below the expected value', async () => {
    const op = LessThanOperator.create();
    expect(await op.compare(int('5'), int('4'))).toBe(true); // actual 4 < expected 5
    expect(await op.compare(float('2.5'), float('1.5'))).toBe(true);
    expect(await op.compare(int('3'), int('4'))).toBe(false); // actual 4 < expected 3
    expect(await op.compare(int('4'), int('4'))).toBe(false); // strict: equal is not less
  });

  it('less_than_equal passes when the actual value is at most the expected value', async () => {
    const op = LessThanEqualOperator.create();
    expect(await op.compare(int('4'), int('4'))).toBe(true);
    expect(await op.compare(float('2.5'), float('2.5'))).toBe(true);
    expect(await op.compare(int('3'), int('4'))).toBe(false); // actual 4 <= expected 3
  });

  it('greater_than passes when the actual value is above the expected value', async () => {
    const gt = GreaterThanOperator.create();
    expect(await gt.compare(int('4'), int('5'))).toBe(true); // actual 5 > expected 4
    expect(await gt.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(await gt.compare(int('5'), int('4'))).toBe(false);
    expect(await gt.compare(int('4'), int('4'))).toBe(false); // strict: equal is not greater
  });

  it('greater_than_equal passes when the actual value is at least the expected value', async () => {
    const gte = GreaterThanEqualOperator.create();
    expect(await gte.compare(int('4'), int('4'))).toBe(true);
    expect(await gte.compare(float('1.5'), float('1.5'))).toBe(true);
    expect(await gte.compare(int('5'), int('4'))).toBe(false); // actual 4 >= expected 5
  });

  it('rejects string operands for numeric-only operators; pointers delegate by dereference', async () => {
    const operators = [
      LessThanOperator.create(),
      LessThanEqualOperator.create(),
      GreaterThanOperator.create(),
      GreaterThanEqualOperator.create(),
      new WithinRangeOperator({ range: '2' })
    ];
    for (const op of operators) {
      await expect(op.compare(string('a'), string('b'))).rejects.toThrow();
    }

    // Legacy supported relational comparisons on pointers by dereferencing
    // the target type; the delegation lives in the pointer operator types.
    const pointer = async (v: string) => new TypeValue(await Pointer.from({ target: 'int' }), { value: v });
    expect(await LessThanOperator.create().compare(await pointer('5'), await pointer('3'))).toBe(true); // actual 3 < expected 5
    expect(await LessThanOperator.create().compare(await pointer('3'), await pointer('5'))).toBe(false);
    expect(await LessThanEqualOperator.create().compare(await pointer('4'), await pointer('4'))).toBe(true);
    expect(await GreaterThanOperator.create().compare(await pointer('4'), await pointer('5'))).toBe(true);
    expect(await new WithinRangeOperator({ range: '2' }).compare(await pointer('4'), await pointer('5'))).toBe(true);
    expect(await new WithinRangeOperator({ range: '2' }).compare(await pointer('4'), await pointer('7'))).toBe(false);
  });

  it('equal and not_equal compare int, float, string, pointer', async () => {
    const eq = EqualOperator.create();
    const ne = NotEqualOperator.create();
    expect(await eq.compare(int('4'), int('4'))).toBe(true);
    expect(await eq.compare(float('1.5'), float('1.5'))).toBe(true);
    expect(await eq.compare(string('a'), string('a'))).toBe(true);
    expect(await eq.compare(await pointer('4'), await pointer('4'))).toBe(true);
    expect(await eq.compare(int('4'), int('5'))).toBe(false);
    expect(await eq.compare(float('1.5'), float('2.5'))).toBe(false);
    expect(await eq.compare(string('a'), string('b'))).toBe(false);
    expect(await eq.compare(await pointer('4'), await pointer('5'))).toBe(false);
    expect(await ne.compare(int('4'), int('5'))).toBe(true);
    expect(await ne.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(await ne.compare(string('a'), string('b'))).toBe(true);
    expect(await ne.compare(await pointer('4'), await pointer('5'))).toBe(true);
    // not_equal must NOT pass on equal values (constant-true regression guard)
    expect(await ne.compare(int('4'), int('4'))).toBe(false);
    expect(await ne.compare(float('1.5'), float('1.5'))).toBe(false);
    expect(await ne.compare(string('a'), string('a'))).toBe(false);
    expect(await ne.compare(await pointer('4'), await pointer('4'))).toBe(false);
  });

  it('within_range compares with the range option, strictly', async () => {
    const op = new WithinRangeOperator({ range: '2' });
    expect(await op.compare(int('4'), int('5'))).toBe(true);
    expect(await op.compare(int('4'), int('7'))).toBe(false);
    expect(await op.compare(int('4'), int('6'))).toBe(false); // |6-4| == range is NOT within
    expect(await op.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(await op.compare(float('1.5'), float('4'))).toBe(false);
  });

  it('rejects non-numeric and negative within_range ranges at parse', () => {
    expect(() => new WithinRangeOperator({ range: 'abc' })).toThrow(/non-negative number/);
    expect(() => new WithinRangeOperator({ range: '-1' })).toThrow(/non-negative number/);
    expect(() => new WithinRangeOperator({ range: '1e3' })).toThrow(/non-negative number/);
  });

  it('rejects fractional ranges for integer comparisons with a clear error', async () => {
    const op = new WithinRangeOperator({ range: '2.5' });
    await expect(op.compare(int('4'), int('5'))).rejects.toThrow(/whole-number range/);
    // float comparisons still accept fractional ranges
    expect(await op.compare(float('1.5'), float('2.5'))).toBe(true);
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

  it('round-trips operator options through the registry', async () => {
    const op = new WithinRangeOperator({ range: '3' });
    const hydrated = await new OperatorRegistry().from(op.toJSON());
    expect(hydrated.options).toEqual({ range: '3' });
    expect(await hydrated.compare(int('4'), int('5'))).toBe(true);
    expect(await hydrated.compare(int('4'), int('8'))).toBe(false);
  });
});
