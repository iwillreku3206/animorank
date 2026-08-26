import type { JsonObject } from '@zenstackhq/orm';
import { Logger } from '$lib/logging/logger';
import { ServerRegistryProvider } from '$lib/registry/server';
import { GlobalRegistryProvider } from '$lib/registry/global';
import type { Problem } from '$lib/problem';
import type { ProblemTestCase } from '$lib/zenstack/models';
import { TypeRegistry } from './typeRegistry';
import { OperatorRegistry } from './operatorRegistry';
import type { FunctionTestCaseProblemData } from './types';
import { FunctionTestCaseProblemDataSchema } from './types';
import { getFunctionTestCaseDataSchema } from './functionTestCase.svelte';

/**
 * Server-side version of extension data loading with structured logging.
 */
export function loadExtensionData(problem: Problem): FunctionTestCaseProblemData {
  const serviceProvider = ServerRegistryProvider.instance();
  const logger = serviceProvider.getService(Logger, 'builtin/testCase/function');

  const {
    data: parsedData,
    error,
    success
  } = FunctionTestCaseProblemDataSchema.safeParse((problem.extension_data as JsonObject)['builtin_testCase_function']);

  if (!success) {
    logger.warning('Invalid extension data detected for problem ' + problem.id + ': ' + JSON.stringify(error));
    return { functions: {} };
  }

  const data: FunctionTestCaseProblemData = { functions: {} };

  const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
  for (const [key, fn] of Object.entries(parsedData.functions)) {
    data.functions[key] = {
      name: fn.name,
      symbol: fn.symbol ?? '',
      parameters: fn.parameters.map((p) => ({
        id: p.id,
        name: p.name ?? '',
        type: p.type ? typeRegistry.from(p.type) : null
      })),
      returnType: fn.returnType.map((t) => (t ? typeRegistry.from(t) : null))
    };
  }

  return data;
}

/**
 * Validate that a function test case's keys resolve against the problem's
 * function definitions: the referenced function must exist, and every stored
 * parameter value must map to a defined, typed parameter. Non-function test
 * cases always pass.
 *
 * Returns a human-readable description of the first problem found, or null
 * when the test case is valid. The edit page runs this before constructing
 * test cases so an orphaned row fails loudly instead of crashing the
 * FunctionTestCase constructor and being silently dropped from the editor.
 */
export function validateFunctionTestCaseKeys(model: ProblemTestCase, problem: Problem): string | null {
  if (model.type !== 'function') return null;

  const parsed = getFunctionTestCaseDataSchema().safeParse(model.data);
  if (!parsed.success) {
    return `Test case ${model.id} has data that does not match the function schema: ${parsed.error.message}`;
  }

  const { function: functionName, parameters } = parsed.data;
  const fn = loadExtensionData(problem).functions[functionName];
  if (!fn) {
    return `Test case ${model.id} references function "${functionName}", which is not defined for this problem (delete the test case or restore the function in the Functions window)`;
  }

  for (let i = 0; i < parameters.length; i++) {
    const definition = fn.parameters[i];
    if (!definition) {
      return `Test case ${model.id} references parameter ${i} of function "${functionName}", which only defines ${fn.parameters.length} parameter(s) (delete the test case or restore the parameter)`;
    }
    if (!definition.type) {
      return `Test case ${model.id} references parameter ${i} of function "${functionName}", which has no type (delete the test case or set the parameter type)`;
    }
  }

  // Comparisons must resolve against the registries and the function's
  // signature — an unregistered type/operator id or a dangling symbol would
  // otherwise throw inside the client constructor and silently drop the row.
  const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
  const operatorRegistry = GlobalRegistryProvider.instance().getRegistry(OperatorRegistry);
  for (const comparison of parsed.data.comparisons) {
    if (!typeRegistry.keys().includes(comparison.value.type)) {
      return `Test case ${model.id} comparison uses unregistered value type "${comparison.value.type}"`;
    }
    if (!operatorRegistry.keys().includes(comparison.operator.type)) {
      return `Test case ${model.id} comparison uses unregistered operator "${comparison.operator.type}"`;
    }
    const symbol = comparison.symbol;
    if (symbol === 'return') {
      if (!fn.returnType[0]) {
        return `Test case ${model.id} compares the return value of function "${functionName}", which has no return type`;
      }
    } else {
      const match = symbol.match(/^param(\d+)$/);
      if (!match || !fn.parameters[parseInt(match[1], 10)]) {
        return `Test case ${model.id} comparison references symbol "${symbol}", which function "${functionName}" does not define`;
      }
    }
  }

  return null;
}
