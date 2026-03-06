import type { Problem, ProblemTestCase } from "../../generated/prisma/client";

export const DEFAULT_TEST_CASE: Omit<ProblemTestCase, "id" | "problem_id" | "created_at" | "updated_at"> = {
  input: "",
  expected_output: "",
  type: "FUNCTION_OUTPUT"
}

export const DEFAULT_PROBLEM: Omit<Problem, "id" | "problem_set_id" | "created_at" | "updated_at"> = {
  name: 'New Problem',
  description: `# New Problem
This is the description of the problem for the student to follow.

Formatting *can* be **done** with ++Markdown++, more specifically, [YFM](https://diplodoc.com/docs/en/index-yfm).

You can also add math formulas with KaTeX (LaTeX-like format): $F(x)=\\frac12x^2$.
  `,
  language: "C",
  visible: false,
}
