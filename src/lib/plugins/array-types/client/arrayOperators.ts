import { EqualOperator } from '$lib/testCase/builtin/functionTestCase/operators/equal';
import { OperatorType } from '$lib/testCase/builtin/functionTestCase/operatorType';
import { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
import { elementValueOf } from '../elementText';
import type { ArrayType } from '../arrayTypes';

/**
 * Array equality: element-wise, in order, through the element type's own
 * equality.
 *
 * The operator registry resolves an operator type by the compared type's id, so
 * a type without a binding here reaches the comparison loop as a lookup failure
 * — this is what makes an `equal` comparison on arrays work end to end.
 *
 * Each element compares the way a scalar of that type compares: an int array by
 * value, a float array by number, a string array by text. The elements are
 * carried as text, so comparing that text directly would grade an expected
 * `0.1` unequal to the `0.10000000000000001` the harness prints for the very
 * same double — the element's operator is what knows better.
 */
export class EqualArrayType extends OperatorType<EqualOperator, ArrayType> {
  public async compare(a: TypeValue<ArrayType>, b: TypeValue<ArrayType>): Promise<boolean> {
    const expected = a.value;
    const actual = b.value;
    if (expected.length !== actual.length) return false;

    const elementType = a.type.elementType;
    const equality = new EqualOperator(this.options);
    for (const [index, text] of expected.entries()) {
      const left = TypeValue.assumedValid(elementType, elementValueOf(elementType, text));
      const right = TypeValue.assumedValid(elementType, elementValueOf(elementType, actual[index]));
      if (!(await equality.compare(left, right))) return false;
    }
    return true;
  }
}
