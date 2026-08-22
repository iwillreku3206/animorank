import { describe, expect, it } from 'vitest';
import { Float } from './float';
import { StringType } from './string';
import { Pointer } from './pointer';
import { VoidType } from './void';
import { LessThanOperator } from '../operators/less_than';
import { TypeValue } from '../typeValue.svelte';
import type { JsonValue } from '@zenstackhq/orm';

describe('Float', () => {
  it('validates floating point values', async () => {
    const float = Float.create();
    expect(await float.validateValue({ value: '1.5' } as JsonValue)).toBe(true);
    expect(await float.validateValue({ value: '-0.25' } as JsonValue)).toBe(true);
    expect(await float.validateValue({ value: '2e10' } as JsonValue)).toBe(true);
    expect(await float.validateValue({ value: 'abc' } as JsonValue)).toBeInstanceOf(Error);
    expect(await float.validateValue({ value: '1e999' } as JsonValue)).toBeInstanceOf(Error);
  });

  it('compares with less_than through the operator registry', () => {
    const op = LessThanOperator.create();
    const a = new TypeValue(Float.create(), { value: '1.5' });
    const b = new TypeValue(Float.create(), { value: '2.5' });
    expect(op.compare(a, b)).toBe(true);
    expect(op.compare(b, a)).toBe(false);
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
    const pointer = new Pointer({ target: 'int' });
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
});
