import type { CType } from "../../../zenstack/models"

/**
  * Converts a C type object to a C code string
*/
export const typeToString = (type: CType): string => {
  let output = ""
  if (!type) return output
  if ((type.base == 'INT' || type.base == 'CHAR')) {
    if (type.signed === true) {
      output += 'signed '
    } else if (type.signed === false) {
      output += 'unsigned '
    }
  }

  if (type.base == 'INT') {
    if (type.sizeModifier) output += `${type.sizeModifier.replaceAll('_', ' ').toLowerCase()} `
  }

  output += type.base.toLowerCase()

  if (type.isPointer) output += '*'

  return output
}
