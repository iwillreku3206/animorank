import { successObject } from '$lib/response';
import { CCodeGenerator } from '$lib/testCase/codeGenerator/c';
import { Int } from '$lib/testCase/type/int';
import { TypeRegistry } from '$lib/testCase/typeRegistry';
import type { FunctionOutputTestCase } from '$lib/zenstack/models';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const testCase: FunctionOutputTestCase = {
    id: '',
    problem_id: '',
    public: false,

    function_name: 'square',
    parameters: [{ type: 'int', data: { signed: 'none', size: 64, value: '5' } }],
    comparisons: [
      {
        type: 'int',
        data: { signed: 'none', size: 64, value: '25' },
        operator: 'EQUAL',
        symbol: 'return'
      }
    ],
    return_type: { type: 'int', data: { signed: 'none', size: 64, value: '0' } },

    type: 'FunctionOutputTestCase',

    created_at: new Date(),
    updated_at: new Date()
  };

  const codeGen = new CCodeGenerator();
  console.log(codeGen.generateTestCode(testCase));

  return successObject({ code: codeGen.generateTestCode(testCase) });
};
