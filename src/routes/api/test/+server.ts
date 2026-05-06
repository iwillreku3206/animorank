import { successObject } from '$lib/response';
import { CCodeGenerator } from '$lib/testCase/codeGenerator/c';
import type { FunctionOutputTestCase } from '$lib/zenstack/models';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const testCase: FunctionOutputTestCase = {
    id: '',
    problem_id: '',
    public: false,

    function_name: 'square',
    parameters: [
      { type: 'float', data: { size: 64, value: '5.0' } },
      {
        type: 'pointer',
        data: {
          target: { type: 'float', data: { size: 64, value: '0.0' } }
        }
      }
    ],
    comparisons: [
      {
        type: 'float',
        data: { size: 64, value: '25.0' },
        operator: 'WITHIN_RANGE',
        symbol: '1',
        range_value: '0.00001'
      }
    ],
    return_type: { type: 'float', data: { size: 64, value: '0.0' } },

    type: 'FunctionOutputTestCase',

    created_at: new Date(),
    updated_at: new Date()
  };

  const codeGen = new CCodeGenerator();
  console.log(codeGen.generateTestCode(testCase));

  return successObject({ code: codeGen.generateTestCode(testCase) });
};
