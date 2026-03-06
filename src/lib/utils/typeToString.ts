import type { CParameterType, CReturnType } from "$lib/types/testCaseInfo";

/**
  * Converts a C type object to a C code string
*/
export const typeToString = (type: CParameterType | CReturnType): string => {
  let output = ""
  if ((type.base == 'int' || type.base == 'char')) {
    if (type.signed === true) {
      output += 'signed '
    } else if (type.signed === false) {
      output += 'unsigned '
    }
  }

  if (type.base == 'int') {
    if (type.sizeModifier) output += `${type.sizeModifier} `
  }

  output += type.base

  if ((type as CParameterType).pointer) output += '*'

  return output
}
