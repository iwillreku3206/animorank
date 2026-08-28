import { describe, expect, it } from 'vitest';
import { Float } from './float';
import { StringType } from './string';
import { Pointer } from './pointer';
import { VoidType } from './void';
import { Integer } from './int';
import { LessThanOperator } from '../operators/less_than';
import { TypeValue } from '../typeValue.svelte';
import type { JsonValue } from '@zenstackhq/orm';

describe('Integer', () => {
  it('validates integer values against the int32 bounds by default', async () => {
    const type = Integer.create();
    expect(await type.validateValue({ value: '0' } as JsonValue)).toBe(true);
    expect(await type.validateValue({ value: '-2147483648' } as JsonValue)).toBe(true);
    expect(await type.validateValue({ value: '2147483647' } as JsonValue)).toBe(true);
    expect(await type.validateValue({ value: '2147483648' } as JsonValue)).toBeInstanceOf(Error);
    expect(await type.validateValue({ value: '-2147483649' } as JsonValue)).toBeInstanceOf(Error);
    expect(await type.validateValue({ value: 'abc' } as JsonValue)).toBeInstanceOf(Error);
  });

  it('enforces 8-bit signed bounds', async () => {
    const int8 = new Integer({ size: 8, signed: true });
    expect(await int8.validateValue({ value: '127' } as JsonValue)).toBe(true);
    expect(await int8.validateValue({ value: '-128' } as JsonValue)).toBe(true);
    expect(await int8.validateValue({ value: '128' } as JsonValue)).toBeInstanceOf(Error);
    expect(await int8.validateValue({ value: '-129' } as JsonValue)).toBeInstanceOf(Error);
  });

  it('enforces unsigned bounds and rejects negatives', async () => {
    const uint8 = new Integer({ size: 8, signed: false });
    expect(await uint8.validateValue({ value: '0' } as JsonValue)).toBe(true);
    expect(await uint8.validateValue({ value: '255' } as JsonValue)).toBe(true);
    expect(await uint8.validateValue({ value: '256' } as JsonValue)).toBeInstanceOf(Error);
    expect(await uint8.validateValue({ value: '-1' } as JsonValue)).toBeInstanceOf(Error);
  });

  it('enforces 64-bit bounds exactly', async () => {
    const int64 = new Integer({ size: 64, signed: true });
    expect(await int64.validateValue({ value: '9223372036854775807' } as JsonValue)).toBe(true);
    expect(await int64.validateValue({ value: '-9223372036854775808' } as JsonValue)).toBe(true);
    expect(await int64.validateValue({ value: '9223372036854775808' } as JsonValue)).toBeInstanceOf(Error);

    const uint64 = new Integer({ size: 64, signed: false });
    expect(await uint64.validateValue({ value: '18446744073709551615' } as JsonValue)).toBe(true);
    expect(await uint64.validateValue({ value: '18446744073709551616' } as JsonValue)).toBeInstanceOf(Error);
  });
});

describe('Float', () => {
  it('validates floating point values', async () => {
    const float = Float.create();
    expect(await float.validateValue({ value: '1.5' } as JsonValue)).toBe(true);
    expect(await float.validateValue({ value: '-0.25' } as JsonValue)).toBe(true);
    expect(await float.validateValue({ value: '2e10' } as JsonValue)).toBe(true);
    expect(await float.validateValue({ value: 'abc' } as JsonValue)).toBeInstanceOf(Error);
    expect(await float.validateValue({ value: '1e999' } as JsonValue)).toBeInstanceOf(Error);
  });

  it('compares with less_than through the operator registry', async () => {
    const op = LessThanOperator.create();
    const expected = new TypeValue(Float.create(), { value: '2.5' });
    const actual = new TypeValue(Float.create(), { value: '1.5' });
    expect(await op.compare(expected, actual)).toBe(true); // actual 1.5 < expected 2.5
    expect(await op.compare(actual, expected)).toBe(false); // actual 2.5 < expected 1.5
  });
});

describe('StringType', () => {
  it('validates string values', async () => {
    const type = StringType.create();
    expect(await type.validateValue({ value: 'hi' } as JsonValue)).toBe(true);
    expect(await type.validateValue(5 as JsonValue)).toBeInstanceOf(Error);
  });
});

describe('Pointer', () => {
  it('validates the inner value against the target type', async () => {
    const pointer = await Pointer.from({ target: 'int' });
    expect(await pointer.validateValue({ value: '0' } as JsonValue)).toBe(true);
    expect(await pointer.validateValue({ nope: true } as JsonValue)).toBeInstanceOf(Error);
  });

  it('defaults to an int target', () => {
    const pointer = Pointer.create();
    expect(pointer.options.target.id).toBe('int');
  });
});

describe('VoidType', () => {
  it('validates empty data and has a void default value', async () => {
    const type = VoidType.create();
    expect(await type.validateValue({} as JsonValue)).toBe(true);
    expect(type.defaultValue().value).toEqual({});
  });

  it('stubs isVoid to true while value types inherit false', () => {
    expect(VoidType.create().isVoid).toBe(true);
    expect(Integer.create().isVoid).toBe(false);
  });
});
