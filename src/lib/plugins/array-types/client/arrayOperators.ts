import type { EqualOperator } from '$lib/testCase/builtin/functionTestCase/operators/equal';
import { OperatorType } from '$lib/testCase/builtin/functionTestCase/operatorType';
import type { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
import type { ArrayType } from '../arrayTypes';

/**
 * Array equality: element-wise, in order.
 *
 * The operator registry resolves an operator type by the compared type's id, so
 * a type without a binding here reaches the comparison loop as a lookup failure
 * — this is what makes an `equal` comparison on arrays work end to end.
 */
export class EqualArrayType extends OperatorType<EqualOperator, ArrayType> {
  public async compare(a: TypeValue<ArrayType>, b: TypeValue<ArrayType>): Promise<boolean> {
    const expected = a.value;
    const actual = b.value;
    return expected.length === actual.length && expected.every((element, index) => element === actual[index]);
  }
}
