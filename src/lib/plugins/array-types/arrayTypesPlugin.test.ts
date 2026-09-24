import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ServerRegistryProvider } from '$lib/registry/server';
import { Registrar } from '$lib/registry/registrar';
import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
import { CTypeRegistry } from '$lib/testCase/builtin/functionTestCase/languages/c/typeRegistry';
import { CExecutionContext } from '$lib/testCase/builtin/functionTestCase/languages/c/executionContext';
import { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
import { Integer } from '$lib/testCase/builtin/functionTestCase/types/int';
import { StringType } from '$lib/testCase/builtin/functionTestCase/types/string';
import { Float } from '$lib/testCase/builtin/functionTestCase/types/float';
import type { Type } from '$lib/testCase/builtin/functionTestCase/type.svelte';
import { ArrayType } from './arrayTypes';
import { CArrayType } from './arrayCType';
import { EqualOperator } from '$lib/testCase/builtin/functionTestCase/operators/equal';
import { Pointer } from '$lib/testCase/builtin/functionTestCase/types/pointer';
import { decodeList, encodeList } from './global';
import { CodeExecutor } from '$lib/executor';
import type { ExecutionRequest, ExecutionResult } from '$lib/executor/types';

/**
 * Load the plugin the way the server loader does: instantiate the server
 * entry's plugin class and let it register against the app's registries.
 *
 * The registrations are process-wide, so the entry runs once per process
 * however many tests ask for it: a second install is a duplicate, not a no-op.
 */
let serverEntryInstalled: Promise<void> | null = null;

function installServerEntry(): Promise<void> {
  return (serverEntryInstalled ??= (async () => {
    const { ServerAnimoRankAPI } = await import('$lib/api/server');
    const { default: ServerEntry } = await import('./server');

    await new ServerEntry().init(new ServerAnimoRankAPI('array-types'));
  })());
}

/** A fresh registry of the kind the app uses, so the test never mutates the app's own. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRegistry = any;

function typeRegistry(): TypeRegistry {
  return new TypeRegistry();
}

function cTypeRegistry(): CTypeRegistry {
  return new CTypeRegistry();
}

/** Register the plugin's types the way its entries do: un-namespaced, so ids stay plain. */
function register(registry: AnyRegistry, key: string, value: unknown): void {
  // Each definition is registered once per process; one already in the registry
  // is the same definition, so a second registration would only throw.
  if (registry.keys().includes(key)) return;
  new Registrar(registry, '').register(key, value as never);
}

describe('array type', () => {
  it('registers under its plain id, which is how the app looks types up', () => {
    const types = typeRegistry();
    register(types, ArrayType.id(), ArrayType);

    expect(ArrayType.id()).toBe('array');
    expect(types.keys()).toContain('array');
  });

  it('defaults to string elements and a fresh length', async () => {
    const type = ArrayType.create();

    expect(type.elementId()).toBe('string');
    expect(type.length).toBe(3);
    expect(type.displayName).toBe('array (char*[3])');
    expect(type.elementType.id).toBe('string');
  });

  it('default-initializes a value to the element type’s own default', async () => {
    const strings = ArrayType.create();
    expect(strings.defaultValue().value).toEqual(['', '', '']);

    const integers = new ArrayType({ element: Integer.create(), length: 2 });
    expect(integers.defaultValue().value).toEqual(['0', '0']);
  });

  it('accepts exactly its length in string elements', async () => {
    const type = new ArrayType({ element: StringType.create(), length: 3 });

    expect(await type.validateValue(['', 'a', 'ünï😀'])).toBe(true);
    expect(await type.validateValue(['a', 'b'])).toBeInstanceOf(Error);
    expect(await type.validateValue(['a', 'b', 'c', 'd'])).toBeInstanceOf(Error);
    expect(await type.validateValue([])).toBeInstanceOf(Error);
    expect(await type.validateValue('a' as never)).toBeInstanceOf(Error);
    expect(await type.validateValue([1, 2, 3] as never)).toBeInstanceOf(Error);
    expect(await type.validateValue([{}, {}, {}] as never)).toBeInstanceOf(Error);
    expect(await type.validateValue(null as never)).toBeInstanceOf(Error);
    expect(await type.validateValue(undefined as never)).toBeInstanceOf(Error);
  });

  it('requires each element to be a decimal number for numeric elements', async () => {
    const integers = new ArrayType({ element: Integer.create(), length: 3 });

    expect(await integers.validateValue(['0', '-12', '2147483647'])).toBe(true);
    expect(await integers.validateValue(['1.5', '0', '0'])).toBeInstanceOf(Error);
    expect(await integers.validateValue(['abc', '0', '0'])).toBeInstanceOf(Error);
  });

  it('hydrates the element type and the length from their serialized form', async () => {
    const type = await ArrayType.from({ element: { type: 'string', options: {} }, length: 4 });
    expect(type.elementId()).toBe('string');
    expect(type.length).toBe(4);

    // A serialized element whose type is unknown falls back to string.
    const unknown = await ArrayType.from({ element: { type: 'not-registered', options: {} } });
    expect(unknown.elementId()).toBe('string');

    // A length that is missing or names nothing usable falls back to the default.
    expect((await ArrayType.from({ element: { type: 'string', options: {} } })).length).toBe(3);
    expect((await ArrayType.from({ element: { type: 'string', options: {} }, length: 0 })).length).toBe(3);
    expect((await ArrayType.from({ element: { type: 'string', options: {} }, length: '4' })).length).toBe(4);
  });
});

describe('array C binding', () => {
  const context = () => new CExecutionContext();

  it('passes an array as a pointer to its element type', async () => {
    const binding = new CArrayType({}, ArrayType.create());

    // An array of strings is a pointer to pointers: the elements are `char*`.
    expect(await binding.generateParameterDefinition('p')).toBe('char** p');
    expect(await binding.generateReturnType()).toBe('char**');
  });

  it('declares exactly the type’s length, with no sentinel', async () => {
    const type = new ArrayType({ element: StringType.create(), length: 2 });
    const value = TypeValue.assumedValid(type, ['a', 'b']);
    const declaration = context();
    await new CArrayType({}, type).pushDeclaration(declaration, 'sym_0', value);

    // Each element is the element type's own declaration — it is what knows how
    // to spell a string — and the array is exactly the type's length.
    expect(declaration.currentCode).toContain('char* sym_0_e0;\nsym_0_e0 = "a";');
    expect(declaration.currentCode).toContain('char* sym_0_e1;\nsym_0_e1 = "b";');
    expect(declaration.currentCode).toContain('char* sym_0_data[2] = {sym_0_e0, sym_0_e1};');
    expect(declaration.currentCode).toContain('char** sym_0 = sym_0_data;');
    expect(declaration.currentCode).not.toContain('NULL');
  });

  it('initializes every slot a value leaves out', async () => {
    // A value that does not fill the declared length (one written before the
    // length changed) still declares a fully initialized array.
    const strings = new ArrayType({ element: StringType.create(), length: 3 });
    const declaration = context();
    await new CArrayType({}, strings).pushDeclaration(declaration, 'sym_0', TypeValue.assumedValid(strings, ['a']));
    expect(declaration.currentCode).toContain('char* sym_0_e1;\nsym_0_e1 = "";');
    expect(declaration.currentCode).toContain('char* sym_0_data[3] = {sym_0_e0, sym_0_e1, sym_0_e2};');

    // A return value has no elements of its own yet: the element type's default
    // fills every slot, so the buffer the call overwrites starts initialized.
    const integers = new ArrayType({ element: Integer.create(), length: 2 });
    const returnDeclaration = context();
    await new CArrayType({}, integers).pushDeclaration(returnDeclaration, 'sym_1');
    expect(returnDeclaration.currentCode).toContain('int sym_1_e0;\nsym_1_e0 = 0;');
    expect(returnDeclaration.currentCode).toContain('int sym_1_data[2] = {sym_1_e0, sym_1_e1};');
    expect(returnDeclaration.currentCode).toContain('int* sym_1 = sym_1_data;');
  });

  it('declares, initializes and prints a pointer element through the pointer binding', async () => {
    const type = new ArrayType({ element: new Pointer({ target: Integer.create() }), length: 2 });
    const value = TypeValue.assumedValid(type, ['5', '6']);
    const binding = new CArrayType({}, type);

    const declaration = context();
    await binding.pushDeclaration(declaration, 'sym_0', value);

    // The pointer binding declares a pointee and points at it, so an element of
    // an int-pointer array is an `int*`, not the `char*` an id-based guess gave.
    expect(declaration.currentCode).toContain('int sym_0_e0__target;\nsym_0_e0__target = 5;');
    expect(declaration.currentCode).toContain('int* sym_0_e0 = &sym_0_e0__target;');
    expect(declaration.currentCode).toContain('int* sym_0_data[2] = {sym_0_e0, sym_0_e1};');
    // A pointer to `int*` elements: the element's own return type, then the
    // array's.
    expect(await binding.generateReturnType()).toBe('int**');

    const printing = context();
    await binding.pushPrint(printing, 'sym_0', 'fh');
    // A pointer element prints its pointee, through the target's conversion.
    expect(printing.currentCode).toContain('fprintf(fh, "%d", *sym_0[sym_0_i]);');
  });

  it('bounds its print loop by the length and prints separators and a terminator', async () => {
    const type = new ArrayType({ element: StringType.create(), length: 2 });
    const printing = context();
    await new CArrayType({}, type).pushPrint(printing, 'sym_0', 'fh');

    expect(printing.currentCode).toContain('for (int sym_0_i = 0; sym_0_i < 2; sym_0_i++) {');
    expect(printing.currentCode).not.toContain('NULL');
    // Octal, because a `\x` escape would absorb the digit that follows it.
    expect(printing.currentCode).toContain('fprintf(fh, "\\037");');
    expect(printing.currentCode).toContain('fprintf(fh, "\\036");');
  });

  it('prints integer and float elements with their own conversions', async () => {
    const integers = new ArrayType({ element: Integer.create(), length: 3 });
    const printing = context();
    await new CArrayType({}, integers).pushPrint(printing, 'sym_0', 'fh');
    expect(printing.currentCode).toContain('fprintf(fh, "%d", sym_0[sym_0_i]);');
    expect(printing.currentCode).toContain('sym_0_i < 3');

    const floats = new ArrayType({
      element: new (await import('$lib/testCase/builtin/functionTestCase/types/float')).Float({ size: 64 }),
      length: 3
    });
    const floatPrinting = context();
    await new CArrayType({}, floats).pushPrint(floatPrinting, 'sym_0', 'fh');
    expect(floatPrinting.currentCode).toContain('fprintf(fh, "%.17g", sym_0[sym_0_i]);');
    expect(floatPrinting.currentCode).toContain('sym_0_i < 3');
  });
});

describe('array equality', () => {
  // The comparison goes through the operator the app resolves for the array
  // type — the same dispatch the grading pipeline uses — so the plugin's
  // equality must be registered exactly as the loader registers it.
  beforeAll(async () => {
    await installServerEntry();
  });

  const equality = () => new EqualOperator(null);
  const ints = () => new ArrayType({ element: Integer.create(), length: 2 });
  const floats = () => new ArrayType({ element: new Float({ size: 64 }), length: 2 });

  it('compares int elements by value, not by their wire text', async () => {
    const type = ints();

    // `007` and `7` are the same int; the element's own equality is what says so.
    await expect(
      equality().compare(TypeValue.assumedValid(type, ['007', '1']), TypeValue.assumedValid(type, ['7', '1']))
    ).resolves.toBe(true);
    await expect(
      equality().compare(TypeValue.assumedValid(type, ['7', '1']), TypeValue.assumedValid(type, ['7', '2']))
    ).resolves.toBe(false);
  });

  it('compares float elements by number, so the harness’s printed text still matches', async () => {
    const type = floats();

    // What the harness prints for 0.1 and 0.3, against what the author wrote.
    const printed = TypeValue.assumedValid(type, ['0.10000000000000001', '0.29999999999999999']);
    const expected = TypeValue.assumedValid(type, ['0.1', '0.3']);

    await expect(equality().compare(expected, printed)).resolves.toBe(true);
    await expect(equality().compare(expected, TypeValue.assumedValid(type, ['0.1', '0.4']))).resolves.toBe(false);
  });

  it('compares string elements by text and refuses a different length', async () => {
    const type = new ArrayType({ element: StringType.create(), length: 2 });

    await expect(
      equality().compare(TypeValue.assumedValid(type, ['a', 'b']), TypeValue.assumedValid(type, ['a', 'b']))
    ).resolves.toBe(true);
    await expect(
      equality().compare(TypeValue.assumedValid(type, ['a', 'b']), TypeValue.assumedValid(type, ['a', 'c']))
    ).resolves.toBe(false);
    // Shorter value, same type: a length mismatch is unequal, not an error.
    await expect(
      equality().compare(TypeValue.assumedValid(type, ['a', 'b']), TypeValue.assumedValid(type, ['a']))
    ).resolves.toBe(false);
  });

  it('compares pointer elements through what they point at', async () => {
    const type = new ArrayType({ element: new Pointer({ target: Integer.create() }), length: 2 });

    await expect(
      equality().compare(TypeValue.assumedValid(type, ['1', '02']), TypeValue.assumedValid(type, ['1', '2']))
    ).resolves.toBe(true);
    await expect(
      equality().compare(TypeValue.assumedValid(type, ['1', '2']), TypeValue.assumedValid(type, ['1', '3']))
    ).resolves.toBe(false);
  });
});

describe('array wire format', () => {
  it('round-trips empty, empty-element, separator-bearing and escaped elements', () => {
    const cases = [[], [''], ['a', 'b'], ['', ''], ['a\x1fb'], ['\x1e'], ['back\\slash'], ['new\nline'], ['ünï😀']];

    for (const elements of cases) {
      expect(decodeList(encodeList(elements))).toEqual(elements);
    }
  });
});

/** Emulates the judge0 contract locally: compile with gcc, run the binary, collect the exported files. */
class GccExecutor extends CodeExecutor {
  public async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-array-suite-'));
    try {
      for (const file of req.files) fs.writeFileSync(path.join(dir, file.path), file.content);
      const compile = spawnSync('gcc', req.processes[0].args, { cwd: dir, encoding: 'utf8' });
      if (compile.status !== 0) {
        return {
          processOutputs: [{ exitCode: compile.status ?? undefined, stderr: Buffer.from(compile.stderr ?? '') }],
          fileOutputs: []
        };
      }
      const run = spawnSync(path.join(dir, '__ar_test_main'), [], { cwd: dir });
      const fileOutputs = (req.exportFiles ?? []).map((name) => ({
        path: name,
        content: fs.readFileSync(path.join(dir, name))
      }));
      return {
        processOutputs: [
          { exitCode: compile.status ?? undefined, stderr: Buffer.from(compile.stderr ?? '') },
          { exitCode: run.status ?? undefined, stderr: run.stderr }
        ],
        fileOutputs
      };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

/** One array test case through the real pipeline: the app's C language, the harness, and gcc. */
async function runArrayCase(
  functions: Record<string, unknown>,
  data: Record<string, unknown>,
  body: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const { ServerTestCaseRegistry } = await import('$lib/testCase/testCaseRegistry.server');
  const { Problem } = await import('$lib/problem');
  const { CLanguage } = await import('$lib/language/c');

  const problem = {
    id: 'problem-array',
    name: 'array integration',
    description: '',
    starter_code: '',
    visible: false,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: { builtin_testCase_function: { functions } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const serverTestCase = await new ServerTestCaseRegistry().from(
    // `public` makes the runner return the comparison results, which is what
    // the assertions read.
    { id: 'tc-array', type: 'function', problem_id: 'problem-array', public: true, data } as never,
    new Problem(problem)
  );
  return serverTestCase.run(new CLanguage(), new GccExecutor(), { sections: { body } });
}

const gccProbe = spawnSync('gcc', ['--version']);
const gccAvailable = gccProbe.status === 0;

describe.skipIf(!gccAvailable)('array C round-trip with gcc', () => {
  /** Same elements in the same order, as text. */
  const exact = (actual: string[], expected: string[]): boolean => JSON.stringify(actual) === JSON.stringify(expected);
  /** The same numbers: `%.17g` is lossless but not always the text that was written. */
  const numeric = (actual: string[], expected: string[]): boolean =>
    actual.length === expected.length && actual.every((value, index) => Number(value) === Number(expected[index]));

  /**
   * One element type's cases: how to build its type, how its printed text is
   * compared, and the element texts to round-trip. Each case's length is its
   * own element count, so a case is exactly as long as the array it fills.
   */
  const suites: Array<{
    label: string;
    element: () => Promise<Type>;
    equals: (_actual: string[], _expected: string[]) => boolean;
    cases: string[][];
  }> = [
    {
      label: 'string',
      element: async () => StringType.create(),
      equals: exact,
      cases: [[''], ['a', 'b'], ['x\x1fy', 'quote"here'], ['back\\slash', 'tab\there']]
    },
    {
      label: 'int',
      element: async () => Integer.create(),
      equals: exact,
      // Zero is an ordinary element now: the print loop is bounded by the
      // length, not by a value that happens to look like a terminator.
      cases: [['0'], ['1', '0', '3'], ['-2147483648', '2147483647', '0']]
    },
    {
      label: 'float',
      element: async () => new Float({ size: 64 }),
      equals: numeric,
      cases: [['0'], ['1.5', '0.25'], ['-0.5', '1e10', '0']]
    },
    {
      // An element that is not a scalar: the array must generate, initialize
      // and print it through the pointer binding, not through a guess.
      label: 'pointer',
      element: async () => new Pointer({ target: Integer.create() }),
      equals: exact,
      cases: [['5'], ['1', '-2', '0']]
    }
  ];

  for (const suite of suites) {
    it(`compiles the generated harness and reads its ${suite.label} array back`, async () => {
      for (const elements of suite.cases) {
        const type = new ArrayType({ element: await suite.element(), length: elements.length });
        const value = TypeValue.assumedValid(type, elements);
        const binding = new CArrayType({}, type);

        const context = new CExecutionContext();
        context.pushHeader('stdio.h', true);
        context.beginFunction('main', 'int', '');
        await binding.pushDeclaration(context, 'sym_0', value);
        context.pushCode('FILE* fh = fopen("__out", "w");');
        await binding.pushPrint(context, 'sym_0', 'fh');
        context.pushCode('fclose(fh);');
        context.pushCode('return 0;');
        context.endFunction();

        const label = `${suite.label} ${JSON.stringify(elements)}`;
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-array-gcc-'));
        try {
          fs.writeFileSync(path.join(dir, 'main.c'), context.currentCode);
          const compiled = spawnSync('gcc', ['-Wall', '-Werror', '-o', '__out_bin', 'main.c'], {
            cwd: dir,
            encoding: 'utf8'
          });
          expect(`${label}: ${compiled.stderr}`).toBe(`${label}: `);
          expect(compiled.status).toBe(0);

          const run = spawnSync(path.join(dir, '__out_bin'), [], { cwd: dir });
          expect(run.status).toBe(0);

          const printed = fs.readFileSync(path.join(dir, '__out'), 'utf8');
          const read = await binding.readFromPrint(printed);
          expect(`${label} -> ${suite.equals(read.value as string[], elements)}`).toBe(`${label} -> true`);
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    });
  }

  it('declares a return array that the call can overwrite', async () => {
    // The harness declares the return value before the call: every slot is
    // initialized, and the pointer is then replaced by what the function
    // returns (a fixed-length array, exactly as the type declares).
    const type = new ArrayType({ element: Integer.create(), length: 2 });
    const binding = new CArrayType({}, type);

    const context = new CExecutionContext();
    context.pushHeader('stdio.h', true);
    context.beginFunction('main', 'int', '');
    await binding.pushDeclaration(context, 'sym_1');
    context.pushCode('static int made[2] = {7, 8};');
    context.pushCode('sym_1 = made;');
    context.pushCode('FILE* fh = fopen("__out", "w");');
    await binding.pushPrint(context, 'sym_1', 'fh');
    context.pushCode('fclose(fh);');
    context.pushCode('return 0;');
    context.endFunction();

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-array-gcc-'));
    try {
      fs.writeFileSync(path.join(dir, 'main.c'), context.currentCode);
      const compiled = spawnSync('gcc', ['-Wall', '-Werror', '-o', '__out_bin', 'main.c'], {
        cwd: dir,
        encoding: 'utf8'
      });
      expect(compiled.stderr).toBe('');
      expect(compiled.status).toBe(0);
      spawnSync(path.join(dir, '__out_bin'), [], { cwd: dir });

      const printed = fs.readFileSync(path.join(dir, '__out'), 'utf8');
      expect((await binding.readFromPrint(printed)).value).toEqual(['7', '8']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('registration through the plugin entries', () => {
  it('makes the array resolvable as a type and as a C language type', async () => {
    // The entries register un-namespaced, the way the loader runs them; a
    // fresh registry of each kind shows what they add.
    const types = typeRegistry();
    const languageTypes = cTypeRegistry();
    expect(types.keys()).not.toContain('array');
    expect(languageTypes.keys()).not.toContain('array');

    register(types, ArrayType.id(), ArrayType);
    register(languageTypes, ArrayType.id(), CArrayType);

    const type = (await (types as AnyRegistry).getStatic('array')).create();
    expect(type).toBeInstanceOf(ArrayType);
    expect(await type.validateValue(['a', 'b', 'c'])).toBe(true);

    const binding = await (languageTypes as AnyRegistry).getInstance('array', undefined, type);
    expect(await binding.generateParameterDefinition('p')).toBe('char** p');
    // The wire form of a one-element list: the element then its terminator.
    expect(await binding.readFromPrint('a\\x1f\\x1e')).toBeInstanceOf(TypeValue);
  });

  it('registers the same type the app-wide registries then hold', async () => {
    // The entry is a plugin class; the server loader instantiates it and runs
    // its `init`, which is what registers against the app's singletons.
    await installServerEntry();

    const appTypes = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
    const appLanguageTypes = ServerRegistryProvider.instance().getRegistry(CTypeRegistry);

    for (const registry of [appTypes, appLanguageTypes]) {
      expect(registry.keys()).toContain('array');
    }
    expect((await (appTypes as AnyRegistry).getStatic('array')).create()).toBeInstanceOf(ArrayType);
  });
});

describe.skipIf(!gccAvailable)('array type through the function test case pipeline', () => {
  // The pipeline resolves the type through the app's registries, so the plugin
  // must be loaded exactly as the loader loads it.
  beforeAll(async () => {
    await installServerEntry();
  });

  const arrayOfStrings = { type: 'array', options: { element: { type: 'string', options: {} }, length: 2 } };
  const identityFn = {
    identity: {
      name: 'identity',
      parameters: [{ name: 'xs', type: arrayOfStrings }],
      returnType: [arrayOfStrings]
    }
  };

  it('passes a correct array submission and reports a mismatched one', async () => {
    const data = (expected: string[]) => ({
      function: 'identity',
      parameters: [{ name: 'xs', value: { ...arrayOfStrings, data: ['a', 'b'] } }],
      comparisons: [
        { symbol: 'return', operator: { type: 'equal', options: {} }, value: { ...arrayOfStrings, data: expected } }
      ]
    });

    // The submitted function returns its array parameter unchanged. The array
    // is its type's length — two elements — and carries no terminator.
    const body = [
      'char** identity(char** xs) {',
      '  static char* out[2];',
      '  out[0] = xs[0];',
      '  out[1] = xs[1];',
      '  return out;',
      '}'
    ].join('\n');

    const passing = await runArrayCase(identityFn, data(['a', 'b']), body);
    expect(passing.success).toBe(true);
    expect(passing.runInfo?.comparisons?.[0]?.result).toBe(true);

    const failing = await runArrayCase(identityFn, data(['a', 'c']), body);
    expect(failing.success).toBe(false);
    expect(failing.runInfo?.comparisons?.[0]?.result).toBe(false);
  });

  it('runs an int array through the pipeline, zero elements included', async () => {
    const arrayOfInts = { type: 'array', options: { element: { type: 'int', options: { size: 32 } }, length: 3 } };
    const sumFn = {
      sum: {
        name: 'sum',
        parameters: [{ name: 'xs', type: arrayOfInts }],
        returnType: [{ type: 'int', options: { size: 32 } }]
      }
    };

    const body = [
      'int sum(int* xs) {',
      '  int total = 0;',
      '  for (int i = 0; i < 3; i++) total += xs[i];',
      '  return total;',
      '}'
    ].join('\n');

    const result = await runArrayCase(
      sumFn,
      {
        function: 'sum',
        parameters: [{ name: 'xs', value: { ...arrayOfInts, data: ['1', '0', '3'] } }],
        comparisons: [
          {
            symbol: 'return',
            operator: { type: 'equal', options: {} },
            value: { type: 'int', options: { size: 32 }, data: { value: '4' } }
          }
        ]
      },
      body
    );

    expect(result.success).toBe(true);
    expect(result.runInfo?.comparisons?.[0]?.result).toBe(true);
  });

  it('grades a float array by number against the text the harness printed', async () => {
    // The generated harness prints doubles with `%.17g`, so 0.1 comes back as
    // `0.10000000000000001`. The comparison has to be the element type's, or a
    // correct submission fails on the printed spelling of a correct value.
    const arrayOfFloats = {
      type: 'array',
      options: { element: { type: 'float', options: { size: 64 } }, length: 2 }
    };
    const identityFn = {
      identity: {
        name: 'identity',
        parameters: [{ name: 'xs', type: arrayOfFloats }],
        returnType: [arrayOfFloats]
      }
    };

    const body = [
      'double* identity(double* xs) {',
      '  static double out[2];',
      '  out[0] = xs[0];',
      '  out[1] = xs[1];',
      '  return out;',
      '}'
    ].join('\n');

    const result = await runArrayCase(
      identityFn,
      {
        function: 'identity',
        parameters: [{ name: 'xs', value: { ...arrayOfFloats, data: ['0.1', '0.3'] } }],
        comparisons: [
          {
            symbol: 'return',
            operator: { type: 'equal', options: {} },
            value: { ...arrayOfFloats, data: ['0.1', '0.3'] }
          }
        ]
      },
      body
    );

    expect(result.success).toBe(true);
    expect(result.runInfo?.comparisons?.[0]?.result).toBe(true);
  });
});
