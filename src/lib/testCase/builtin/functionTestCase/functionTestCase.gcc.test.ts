// Integration tests that compile and run the generated C harness with a real
// gcc. The production pipeline (gcc -Wall -Werror, then the harness binary)
// needs no judge0, so these tests exercise the codegen end to end: a codegen
// regression that produces invalid C (broken literals, wrong printf formats,
// bad escaping) can no longer pass a stubbed executor. Skipped when gcc is
// not available on the test machine.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
import { CodeExecutor } from '$lib/executor';
import type { ExecutionRequest, ExecutionResult } from '$lib/executor/types';
import type { TestCaseResult } from '$lib/testCase/types';
import type { FunctionTestCaseRunInfo } from './functionTestCase.svelte';
import { CLanguage } from '$lib/language/c';

const gccProbe = spawnSync('gcc', ['--version']);
const gccAvailable = gccProbe.status === 0;

/** Emulates the judge0 contract locally: compile with gcc, run the binary,
 * and return the exported files the harness wrote. */
class GccExecutor extends CodeExecutor {
  public async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-gcc-'));
    try {
      for (const f of req.files) fs.writeFileSync(path.join(dir, f.path), f.content);
      const cc = spawnSync('gcc', req.processes[0].args, { cwd: dir, encoding: 'utf8' });
      const compile = { exitCode: cc.status ?? undefined, stderr: Buffer.from(cc.stderr ?? '') };
      if (cc.status !== 0) {
        return { processOutputs: [compile, { exitCode: undefined }], fileOutputs: [] };
      }
      const run = spawnSync(path.join(dir, '__ar_test_main'), [], { cwd: dir });
      const fileOutputs = (req.exportFiles ?? []).map((name) => ({
        path: name,
        content: fs.readFileSync(path.join(dir, name))
      }));
      return { processOutputs: [compile, { exitCode: run.status ?? undefined, stderr: run.stderr }], fileOutputs };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

const gcc = new GccExecutor();

const int32 = { type: 'int', options: { size: 32, signed: null } };
const int64Unsigned = { type: 'int', options: { size: 64, signed: false } };
const float32 = { type: 'float', options: { size: 32 } };

function makeProblem(functions: Record<string, unknown>): ProblemModel {
  return {
    id: 'problem-gcc',
    name: 'gcc integration',
    description: '',
    starter_code: '',
    visible: false,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: { builtin_testCase_function: { functions } }
  } as unknown as ProblemModel;
}

async function runCase(
  functions: Record<string, unknown>,
  data: Record<string, unknown>,
  body: string
): Promise<TestCaseResult<FunctionTestCaseRunInfo>> {
  const serverTestCase = new ServerTestCaseRegistry().from(
    {
      id: 'tc-gcc',
      type: 'function',
      problem_id: 'problem-gcc',
      data
    } as unknown as ProblemTestCase,
    new Problem(makeProblem(functions))
  );
  return serverTestCase.run(new CLanguage(), gcc, { sections: { body } });
}

const squareFn = {
  square: {
    name: 'square',
    parameters: [{ name: 'x', type: int32 }],
    returnType: [int32]
  }
};
const squareData = (expected: string, operator: Record<string, unknown> = { type: 'equal', options: {} }) => ({
  function: 'square',
  parameters: [{ name: 'x', value: { ...int32, data: { value: '3' } } }],
  comparisons: [{ symbol: 'return', operator, value: { ...int32, data: { value: expected } } }]
});

describe.skipIf(!gccAvailable)('CFunctionTestCase integration (real gcc)', () => {
  it('compiles the generated harness and passes a correct submission', async () => {
    const result = await runCase(squareFn, squareData('9'), 'int square(int x) { return x * x; }');

    expect(result.success).toBe(true);
    if ('runInfo' in result && 'comparisons' in result.runInfo) {
      expect(result.runInfo.comparisons[0]).toMatchObject({
        symbol: 'return',
        result: true,
        actual: { value: { value: '9' } }
      });
    }
  });

  it('fails a mismatched comparison through the normal comparison loop', async () => {
    // expected 5, function returns 4: the harness compiles and runs, and the
    // JS comparison loop must produce a real failed result — not a crash or
    // a fabricated failure branch.
    const result = await runCase(squareFn, squareData('5'), 'int square(int x) { return 4; }');

    expect(result.success).toBe(false);
    if ('runInfo' in result && 'comparisons' in result.runInfo) {
      expect(result.runInfo.comparisons[0]).toMatchObject({
        symbol: 'return',
        result: false,
        actual: { value: { value: '4' } }
      });
    }
  });

  it('exercises less_than through the pipeline', async () => {
    const lessThan = { type: 'less_than', options: {} };
    const passing = await runCase(squareFn, squareData('5', lessThan), 'int square(int x) { return 4; }');
    expect(passing.success).toBe(true);

    const failing = await runCase(squareFn, squareData('3', lessThan), 'int square(int x) { return 4; }');
    expect(failing.success).toBe(false);
    if ('runInfo' in failing && 'comparisons' in failing.runInfo) {
      expect(failing.runInfo.comparisons[0].result).toBe(false);
    }
  });

  it('exercises within_range through the pipeline, pinning strict bounds', async () => {
    const withinRange = { type: 'within_range', options: { range: '3' } };
    // |7 - 5| = 2 < 3 → within range
    const passing = await runCase(squareFn, squareData('5', withinRange), 'int square(int x) { return 7; }');
    expect(passing.success).toBe(true);

    // |8 - 5| = 3 is NOT < 3 → strict bound
    const boundary = await runCase(squareFn, squareData('5', withinRange), 'int square(int x) { return 8; }');
    expect(boundary.success).toBe(false);
  });

  it('round-trips float32 through the printed file (M5 regression)', async () => {
    const thirdFn = { third: { name: 'third', parameters: [], returnType: [float32] } };
    const result = await runCase(
      thirdFn,
      {
        function: 'third',
        parameters: [],
        comparisons: [
          {
            symbol: 'return',
            operator: { type: 'equal', options: {} },
            value: { ...float32, data: { value: '0.333333343' } }
          }
        ]
      },
      'float third(void) { return 1.0f / 3.0f; }'
    );
    expect(result.success).toBe(true);
  });

  it('compiles and matches UINT64_MAX literals (M6 regression)', async () => {
    const identityFn = {
      identity: {
        name: 'identity',
        parameters: [{ name: 'x', type: int64Unsigned }],
        returnType: [int64Unsigned]
      }
    };
    const result = await runCase(
      identityFn,
      {
        function: 'identity',
        parameters: [{ name: 'x', value: { ...int64Unsigned, data: { value: '18446744073709551615' } } }],
        comparisons: [
          {
            symbol: 'return',
            operator: { type: 'equal', options: {} },
            value: { ...int64Unsigned, data: { value: '18446744073709551615' } }
          }
        ]
      },
      'unsigned long long int identity(unsigned long long int x) { return x; }'
    );
    expect(result.success).toBe(true);
  });
});
