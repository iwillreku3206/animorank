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

  it('less_than compares int, float', () => {
    const op = LessThanOperator.create();
    expect(op.compare(int('3'), int('4'))).toBe(true);
    expect(op.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(op.compare(int('4'), int('3'))).toBe(false);
  });

  it('less_than_equal compares int, float', () => {
    const op = LessThanEqualOperator.create();
    expect(op.compare(int('4'), int('4'))).toBe(true);
    expect(op.compare(float('2.5'), float('2.5'))).toBe(true);
    expect(op.compare(int('5'), int('4'))).toBe(false);
  });

  it('greater_than and greater_than_equal compare int, float', () => {
    const gt = GreaterThanOperator.create();
    const gte = GreaterThanEqualOperator.create();
    expect(gt.compare(int('5'), int('4'))).toBe(true);
    expect(gt.compare(float('2.5'), float('1.5'))).toBe(true);
    expect(gte.compare(int('4'), int('4'))).toBe(true);
    expect(gte.compare(float('1.5'), float('1.5'))).toBe(true);
    expect(gt.compare(int('4'), int('5'))).toBe(false);
  });

  it('rejects string and pointer operands for numeric-only operators', () => {
    const operators = [
      LessThanOperator.create(),
      LessThanEqualOperator.create(),
      GreaterThanOperator.create(),
      GreaterThanEqualOperator.create(),
      new WithinRangeOperator({ range: '2' })
    ];
    for (const op of operators) {
      expect(() => op.compare(string('a'), string('b'))).toThrow();
      expect(() => op.compare(pointer('3'), pointer('4'))).toThrow();
    }
  });

  it('equal and not_equal compare int, float, string, pointer', () => {
    const eq = EqualOperator.create();
    const ne = NotEqualOperator.create();
    expect(eq.compare(int('4'), int('4'))).toBe(true);
    expect(eq.compare(float('1.5'), float('1.5'))).toBe(true);
    expect(eq.compare(string('a'), string('a'))).toBe(true);
    expect(eq.compare(pointer('4'), pointer('4'))).toBe(true);
    expect(eq.compare(int('4'), int('5'))).toBe(false);
    expect(ne.compare(int('4'), int('5'))).toBe(true);
    expect(ne.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(ne.compare(string('a'), string('b'))).toBe(true);
    expect(ne.compare(pointer('4'), pointer('5'))).toBe(true);
  });

  it('within_range compares with the range option', () => {
    const op = new WithinRangeOperator({ range: '2' });
    expect(op.compare(int('4'), int('5'))).toBe(true);
    expect(op.compare(int('4'), int('7'))).toBe(false);
    expect(op.compare(float('1.5'), float('2.5'))).toBe(true);
    expect(op.compare(float('1.5'), float('4'))).toBe(false);
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
  });

  it('round-trips operator options through the registry', () => {
    const op = new WithinRangeOperator({ range: '3' });
    const hydrated = OperatorRegistry.instance().from(op.toJSON());
    expect(hydrated.options).toEqual({ range: '3' });
    expect(hydrated.compare(int('4'), int('5'))).toBe(true);
    expect(hydrated.compare(int('4'), int('8'))).toBe(false);
  });
});
