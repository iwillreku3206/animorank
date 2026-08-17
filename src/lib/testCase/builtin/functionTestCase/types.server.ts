import type { JsonObject } from '@zenstackhq/orm';
import { Logger } from '$lib/logging/logger';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import type { Problem } from '$lib/problem';
import { TypeRegistry } from './typeRegistry';
import type { FunctionTestCaseProblemData } from './types';
import { FunctionTestCaseProblemDataSchema } from './types';

/**
 * Server-side version of extension data loading with structured logging.
 */
export function loadExtensionData(problem: Problem): FunctionTestCaseProblemData {
  const serviceProvider = ServerServiceProvider.instance();
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

  for (const [key, fn] of Object.entries(parsedData.functions)) {
    data.functions[key] = {
      name: fn.name,
      symbol: fn.symbol ?? '',
      parameters: fn.parameters.map((p) => ({
        name: p.name ?? '',
        type: p.type ? TypeRegistry.instance().from(p.type) : null
      })),
      returnType: fn.returnType.map((t) => (t ? TypeRegistry.instance().from(t) : null))
    };
  }

  return data;
}
