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
import { ArrayType } from './arrayTypes';
import { CArrayType } from './arrayCType';
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

  it('defaults to string elements and resolves the element through the registry', async () => {
    const type = ArrayType.create();

    expect(type.elementId()).toBe('string');
    expect(type.displayName).toBe('array (char*[])');
    expect(type.elementType.id).toBe('string');
  });

  it('accepts any array of strings for string elements', async () => {
    const type = ArrayType.create();

    expect(await type.validateValue([])).toBe(true);
    expect(await type.validateValue(['', 'a', 'ünï😀'])).toBe(true);
    expect(await type.validateValue('a' as never)).toBeInstanceOf(Error);
    expect(await type.validateValue([1] as never)).toBeInstanceOf(Error);
    expect(await type.validateValue([{}] as never)).toBeInstanceOf(Error);
    expect(await type.validateValue(null as never)).toBeInstanceOf(Error);
    expect(await type.validateValue(undefined as never)).toBeInstanceOf(Error);
  });

  it('requires each element to be a decimal number for numeric elements', async () => {
    const integers = new ArrayType({ element: Integer.create() });

    expect(await integers.validateValue(['0', '-12', '2147483647'])).toBe(true);
    expect(await integers.validateValue(['1.5'])).toBeInstanceOf(Error);
    expect(await integers.validateValue(['abc'])).toBeInstanceOf(Error);
  });

  it('hydrates the element type and options from their serialized form', async () => {
    const type = await ArrayType.from({ element: { type: 'string', options: {} } });
    expect(type.elementId()).toBe('string');

    // A serialized element whose type is unknown falls back to string.
    const unknown = await ArrayType.from({ element: { type: 'not-registered', options: {} } });
    expect(unknown.elementId()).toBe('string');
  });
});

describe('array C binding', () => {
  const context = () => new CExecutionContext();

  it('passes an array as a single null-terminated pointer', async () => {
    const binding = new CArrayType({}, ArrayType.create());

    // An array of strings is a pointer to pointers: the elements are `char*`.
    expect(await binding.generateParameterDefinition('p')).toBe('char** p');
    expect(await binding.generateReturnType()).toBe('char**');
  });

  it('declares the elements as a compound literal and prints them with separators', async () => {
    const type = ArrayType.create();
    const value = new TypeValue(type, ['a', 'b']);
    const declaration = context();
    await new CArrayType({}, type).pushDeclaration(declaration, 'sym_0', value);

    expect(declaration.currentCode).toContain('char* sym_0_data[] = {"a", "b", NULL};');
    expect(declaration.currentCode).toContain('char** sym_0 = sym_0_data;');

    const printing = context();
    await new CArrayType({}, type).pushPrint(printing, 'sym_0', 'fh');

    expect(printing.currentCode).toContain('sym_0[sym_0_i] != NULL');
    // Octal, because a `\x` escape would absorb the digit that follows it.
    expect(printing.currentCode).toContain('fprintf(fh, "\\037");');
    expect(printing.currentCode).toContain('fprintf(fh, "\\036");');
  });

  it('prints integer and float elements with their own conversions', async () => {
    const integers = new ArrayType({ element: Integer.create() });
    const printing = context();
    await new CArrayType({}, integers).pushPrint(printing, 'sym_0', 'fh');
    expect(printing.currentCode).toContain('fprintf(fh, "%d", sym_0[sym_0_i]);');

    const floats = new ArrayType({
      element: new (await import('$lib/testCase/builtin/functionTestCase/types/float')).Float({ size: 64 })
    });
    const floatPrinting = context();
    await new CArrayType({}, floats).pushPrint(floatPrinting, 'sym_0', 'fh');
    expect(floatPrinting.currentCode).toContain('fprintf(fh, "%.17g", sym_0[sym_0_i]);');
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
  it('compiles the generated harness and reads the printed array back', async () => {
    const cases: string[][] = [[], [''], ['a', 'b'], ['x\x1fy', 'quote"here'], ['back\\slash', 'tab\there']];

    for (const elements of cases) {
      const type = ArrayType.create();
      const value = new TypeValue(type, elements);
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

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-array-gcc-'));
      try {
        fs.writeFileSync(path.join(dir, 'main.c'), context.currentCode);
        const compiled = spawnSync('gcc', ['-Wall', '-Werror', '-o', '__out_bin', 'main.c'], {
          cwd: dir,
          encoding: 'utf8'
        });
        expect(`${JSON.stringify(elements)}: ${compiled.stderr}`).toBe(`${JSON.stringify(elements)}: `);
        expect(compiled.status).toBe(0);

        const run = spawnSync(path.join(dir, '__out_bin'), [], { cwd: dir });
        expect(run.status).toBe(0);

        const printed = fs.readFileSync(path.join(dir, '__out'), 'utf8');
        const read = await binding.readFromPrint(printed);
        expect(`${JSON.stringify(elements)} -> ${JSON.stringify(read.value)}`).toBe(
          `${JSON.stringify(elements)} -> ${JSON.stringify(elements)}`
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
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
    expect(await type.validateValue(['a'])).toBe(true);

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

  const arrayOfStrings = { type: 'array', options: { element: { type: 'string', options: {} } } };
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

    // The submitted function returns its array parameter unchanged.
    const body = [
      'char** identity(char** xs) {',
      '  static char* out[3];',
      '  out[0] = xs[0];',
      '  out[1] = xs[1];',
      '  out[2] = NULL;',
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
});
