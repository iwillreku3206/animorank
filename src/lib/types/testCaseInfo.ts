import type { ProblemTestCaseType } from "../../../generated/prisma/enums"

interface TestCaseInfoBase {
  /** For redundancy and verification */
  type: ProblemTestCaseType
}

export type CReturnType = {
  base: "int",
  sizeModifier?: "long" | "long long" | "short",
  signed?: boolean
} | {
  base: "char",
  signed?: boolean
} | {
  base: "bool" | "float" | "double"
}

export type CParameterType = CReturnType & { pointer?: boolean }


export interface FunctionTestCaseInfo extends TestCaseInfoBase {
  /** The name of the function */
  functionName: string

  /** The expected return type of the function */
  returnType: CReturnType,

  /** Parameters of the function */
  parameters: {
    type: CParameterType,
    value: string
  }[]
}

export type TestCaseInfo = FunctionTestCaseInfo
