import type { Comparison, FunctionOutputTestCase } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
import { TypeRegistry } from '../typeRegistry';
import { CodeGenerator } from './codeGenerator';
import type { LanguageType } from '../type/languageType';

export class CCodeGenerator extends CodeGenerator {
  private generateFunctionSignature(testCase: FunctionOutputTestCase) {
    const { return_type, parameters, function_name } = testCase;
    const typeRegistry = TypeRegistry.instance();

    const returnType = typeRegistry
      .getInstance(return_type.type, return_type.data || undefined)
      .getLanguage('c')
      .constructTypeExpression();

    const parameterTypes = parameters.map((parameter) => {
      return typeRegistry
        .getInstance(parameter.type, parameter.data || undefined)
        .getLanguage('c')
        .constructTypeExpression();
    });

    return `${returnType} ${function_name}(${parameterTypes.join(', ')});`;
  }

  private generateComparison(
    comparison: Comparison,
    testIndex: number,
    parameters: Array<{ type: string; data: JsonValue }>
  ) {
    const { data, operator, symbol, type, range_value } = comparison;

    const typeRegistry = TypeRegistry.instance();

    const expectedSymbol = `__ar_test_expected_${testIndex}`;
    const expected = typeRegistry.getInstance(type, data || undefined).getLanguage('c');

    let actualSymbol: string;
    let actualLanguage: LanguageType<unknown>;

    if (symbol === 'return') {
      actualSymbol = '__ar_test_return_value';
      actualLanguage = expected;
    } else {
      actualSymbol = `__ar_test_param_${symbol}`;
      const param = parameters[parseInt(symbol)];
      actualLanguage = typeRegistry.getInstance(param.type, param.data).getLanguage('c');
    }

    const resolvedSymbol = actualLanguage.resolveSymbol(actualSymbol);

    const comparisonSymbol = `__ar_test_${testIndex}_comparison`;
    let comparisonExpression = comparisonSymbol;
    let comparisonCompute: string;

    switch (operator) {
      case 'GREATER_THAN_EQUAL':
        comparisonExpression = `!${comparisonExpression}`;
      // eslint-disable-next-line no-fallthrough
      case 'LESS_THAN':
        comparisonCompute = expected.constructLessThanCheck(
          comparisonSymbol,
          resolvedSymbol,
          expectedSymbol
        );
        break;
      case 'GREATER_THAN':
        comparisonExpression = `!${comparisonExpression}`;
      // eslint-disable-next-line no-fallthrough
      case 'LESS_THAN_EQUAL':
        comparisonCompute = expected.constructLessThanEqualCheck(
          comparisonSymbol,
          resolvedSymbol,
          expectedSymbol
        );
        break;
      case 'NOT_EQUAL':
        comparisonExpression = `!${comparisonExpression}`;
      // eslint-disable-next-line no-fallthrough
      case 'EQUAL':
        comparisonCompute = expected.constructEqualityCheck(
          comparisonSymbol,
          resolvedSymbol,
          expectedSymbol
        );
        break;
      case 'WITHIN_RANGE':
        comparisonCompute = expected.constructWithinRangeCheck(
          comparisonSymbol,
          resolvedSymbol,
          expectedSymbol,
          range_value as string
        );
    }

    return `${actualLanguage.constructPrint(actualSymbol)};
printf("\\n");
${expected.constructInit(expectedSymbol)}
${expected.constructPrint(expectedSymbol)}
printf("\\n");
${comparisonCompute}
printf("%d\\n", ${comparisonExpression});`;
  }

  public generateTestCode(testCase: FunctionOutputTestCase): string {
    const typeRegistry = TypeRegistry.instance();

    const { return_type, parameters, function_name, comparisons } = testCase;
    const returnType = typeRegistry.getInstance(return_type.type, return_type.data || undefined);
    const returnTypeExpression = returnType.getLanguage('c').constructTypeExpression();

    const params = parameters.map((parameter) =>
      typeRegistry.getInstance(parameter.type, parameter.data || undefined).getLanguage('c')
    );

    return `
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>
${this.generateFunctionSignature(testCase)}

int main() {
  ${params.map((param, index) => param.constructInit(`__ar_test_param_${index}`)).join('\n\n')}
  ${returnTypeExpression !== 'void' ? `${returnTypeExpression} __ar_test_return_value = ` : ''} ${function_name}(${parameters.map((_, index) => `__ar_test_param_${index}`)});
  ${comparisons.map((comparison, index) =>
    this.generateComparison(
      comparison,
      index,
      parameters.map((p) => ({ ...p, data: p.data || {} }))
    )
  )}
  return 0;
}
    `;
  }
}
