import type { Comparison, FunctionOutputTestCase } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
import type { TypeWithValue } from '../type';
import { TypeRegistry } from '../typeRegistry';
import { CodeGenerator } from './codeGenerator';

export class CCodeGenerator extends CodeGenerator {
  private generateFunctionSignature(testCase: FunctionOutputTestCase) {
    const { return_type, parameters, function_name } = testCase;
    const typeRegistry = TypeRegistry.instance();

    const returnType = typeRegistry
      .getInstance(return_type.type, return_type.data)
      .getLanguage('c')
      .constructTypeExpression();

    const parameterTypes = parameters.map((parameter) => {
      return typeRegistry
        .getInstance(parameter.type, parameter.data)
        .getLanguage('c')
        .constructTypeExpression();
    });

    return `${returnType} ${function_name}(${parameterTypes.join(', ')});`;
  }

  private generateComparison(comparison: Comparison, testIndex: number): string {
    const { data, operator, symbol, type, range_value } = comparison;

    const typeRegistry = TypeRegistry.instance();

    const expectedSymbol = `__ar_test_expected_${testIndex}`;
    const expected = typeRegistry.getInstance(type, data).getLanguage('c');

    if (symbol === 'return') {
      var actualSymbol = '__ar_test_return_value';
    } else {
      var actualSymbol = `__ar_test_param_index_${symbol}`;
    }

    const comparisonSymbol = `__ar_test_${testIndex}_comparison`;
    let comparisonExpression = comparisonSymbol;
    let comparisonCompute: string;

    switch (operator) {
      case 'GREATER_THAN_EQUAL':
        comparisonExpression = `!${comparisonExpression}`;
      case 'LESS_THAN':
        comparisonCompute = expected.constructLessThanCheck(
          comparisonSymbol,
          actualSymbol,
          expectedSymbol
        );
        break;
      case 'GREATER_THAN':
        comparisonExpression = `!${comparisonExpression}`;
      case 'LESS_THAN_EQUAL':
        comparisonCompute = expected.constructLessThanEqualCheck(
          comparisonSymbol,
          actualSymbol,
          expectedSymbol
        );
        break;
      case 'NOT_EQUAL':
        comparisonExpression = `!${comparisonExpression}`;
      case 'EQUAL':
        comparisonCompute = expected.constructEqualityCheck(
          comparisonSymbol,
          actualSymbol,
          expectedSymbol
        );
        break;
      case 'WITHIN_RANGE':
        comparisonCompute = expected.constructWithinRangeCheck(
          comparisonSymbol,
          actualSymbol,
          expectedSymbol,
          range_value as string
        );
    }

    return `${expected.constructPrint(actualSymbol)};
printf("\\n");
${expected.constructInit(expectedSymbol)}
${expected.constructPrint(expectedSymbol)}
printf("\\n");
${comparisonCompute}
if (!${comparisonExpression}) {
  __ar_test_success = 0;
}
printf("%d\\n", ${comparisonExpression});`;
  }

  public generateTestCode(testCase: FunctionOutputTestCase): string {
    const typeRegistry = TypeRegistry.instance();

    const { return_type, parameters, function_name, comparisons } = testCase;
    const returnType = typeRegistry.getInstance(return_type.type, return_type.data);
    const returnTypeExpression = returnType.getLanguage('c').constructTypeExpression();

    const params = parameters.map((parameter) =>
      typeRegistry.getInstance(parameter.type, parameter.data).getLanguage('c')
    );

    return `#include <submission.c>
#include <stdio.h>
${this.generateFunctionSignature(testCase)}

int main() {
  int __ar_test_success = 1;
  ${params.map((param, index) => param.constructInit(`__ar_test_param_${index}`)).join('\n\n')}
  ${returnTypeExpression} __ar_test_return_value = ${function_name}(${parameters.map((_, index) => `__ar_test_param_${index}`)});
  ${comparisons.map((comparison, index) => this.generateComparison(comparison, index))}
  return !__ar_test_success;
}
    `;
  }
}
