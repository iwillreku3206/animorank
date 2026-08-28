import { describe, expect, it } from 'vitest';
import { CInteger } from './integer';
import { CFloat } from './float';
import { CExecutionContext } from '../executionContext';
import { Integer } from '../../../types/int';
import { Float } from '../../../types/float';
import { TypeValue } from '../../../typeValue.svelte';
import type { CFunctionTestCase } from '../c';

// pushDeclaration/pushPrint only consult `this.type`; the language reference
// is unused by them, so a placeholder satisfies the constructor.
const language = {} as unknown as CFunctionTestCase;

const intType = (options: { size: number; signed: boolean | null }) => new Integer(options);
const intValue = (options: { size: number; signed: boolean | null }, value: string) =>
  new TypeValue(intType(options), { value });

async function emitted(block: (ctx: CExecutionContext) => Promise<void>): Promise<string> {
  const ctx = new CExecutionContext();
  await block(ctx);
  return ctx.currentCode;
}

describe('CFloat.pushPrint', () => {
  it('prints float32 with round-trip precision (%.9g)', async () => {
    const code = await emitted(async (ctx) =>
      new CFloat(language, new Float({ size: 32 })).pushPrint(ctx, 'sym_0', 'fh')
    );
    expect(code).toContain('fprintf(fh, "%.9g", sym_0);');
  });

  it('prints float64 with round-trip precision (%.17g)', async () => {
    const code = await emitted(async (ctx) =>
      new CFloat(language, new Float({ size: 64 })).pushPrint(ctx, 'sym_0', 'fh')
    );
    expect(code).toContain('fprintf(fh, "%.17g", sym_0);');
  });
});

describe('CInteger.pushDeclaration', () => {
  it('emits no suffix for 32-bit literals', async () => {
    const code = await emitted(async (ctx) =>
      new CInteger(language, intType({ size: 32, signed: true })).pushDeclaration(
        ctx,
        'x',
        intValue({ size: 32, signed: true }, '42')
      )
    );
    expect(code).toContain('x = 42;');
  });

  it('emits ll for signed 64-bit literals', async () => {
    const code = await emitted(async (ctx) =>
      new CInteger(language, intType({ size: 64, signed: true })).pushDeclaration(
        ctx,
        'x',
        intValue({ size: 64, signed: true }, '9223372036854775807')
      )
    );
    expect(code).toContain('x = 9223372036854775807ll;');
  });

  it('emits ull for unsigned 64-bit literals so UINT64_MAX compiles', async () => {
    const code = await emitted(async (ctx) =>
      new CInteger(language, intType({ size: 64, signed: false })).pushDeclaration(
        ctx,
        'x',
        intValue({ size: 64, signed: false }, '18446744073709551615')
      )
    );
    expect(code).toContain('x = 18446744073709551615ull;');
  });

  it('emits INT64_MIN as an arithmetic expression', async () => {
    const code = await emitted(async (ctx) =>
      new CInteger(language, intType({ size: 64, signed: true })).pushDeclaration(
        ctx,
        'x',
        intValue({ size: 64, signed: true }, '-9223372036854775808')
      )
    );
    expect(code).toContain('x = (-9223372036854775807ll - 1ll);');
  });

  it('treats unset signedness as signed for 64-bit suffixes', async () => {
    const code = await emitted(async (ctx) =>
      new CInteger(language, intType({ size: 64, signed: null })).pushDeclaration(
        ctx,
        'x',
        intValue({ size: 64, signed: null }, '9223372036854775807')
      )
    );
    expect(code).toContain('x = 9223372036854775807ll;');
  });
});
