// Topic/subtopic data for the HeroGraph landing-page web. Big nodes are CCPROG1
// topics; small nodes are their subtopics. Pulled out of HeroGraph.svelte the
// same way coursePrograms.ts is pulled out of the autograder demo, so the data
// is editable on its own without touching the graph's layout/render logic.
//
// Edges come from two places, and the distinction matters:
//   - PREREQS  : topic <-> topic. The course's actual dependency spine.
//   - RELATIONS: topic -> subtopic. Membership.
// Keeping these separate is what lets the graph be a web instead of a row of
// disconnected stars. A subtopic is listed under two topics ONLY when it
// genuinely belongs to both (see the notes on RELATIONS below) -- never just to
// manufacture a cross-link.

export type Topic = { id: string; name: string };

/* --- OLD course data (kept for restore) ---
export const TOPICS: Topic[] = [
  { id: 'CCPROG1', name: 'Programming 1' },
  { id: 'CCPROG2', name: 'Programming 2' },
  { id: 'CCPROG3', name: 'Programming 3' },
  { id: 'CSALGCM', name: 'Algorithms & Complexity' },
  { id: 'CSINTSY', name: 'Intelligent Systems' }
];

export const RELATIONS: Record<string, string[]> = {
  CCPROG1: ['I/O', 'Loops', 'Conditions', 'Functions'],
  CCPROG2: ['Arrays', 'Strings', 'Structs', 'Files', 'Functions'],
  CCPROG3: ['Structs', 'Trees', 'Stacks', 'Queues'],
  CSALGCM: [
    'Sorting',
    'Search',
    'Trees',
    'Graphs',
    'Divide and Conquer',
    'Dynamic Programming',
    'Greedy Algorithms'
  ],
  CSINTSY: ['Search', 'Graphs', 'Trees']
};

export const TOPIC_ANCHORS: Record<string, [number, number]> = {
  CCPROG1: [22, 20],
  CCPROG2: [52, 15],
  CCPROG3: [78, 24],
  CSALGCM: [70, 56],
  CSINTSY: [46, 40]
};
--- end OLD course data --- */

// CCPROG1 topics (big nodes), in syllabus order.
//   Variables/I/O  week 1
//   Expressions    week 2
//   Conditionals   weeks 3-4
//   Functions      week 5
//   Loops          weeks 7, 8, 10
//   Pointers       week 11
export const TOPICS: Topic[] = [
  { id: 'Variables', name: 'Variables' },
  { id: 'I/O', name: 'I/O' },
  { id: 'Expressions', name: 'Expressions' },
  { id: 'Conditionals', name: 'Conditionals' },
  { id: 'Functions', name: 'Functions' },
  { id: 'Loops', name: 'Loops' },
  { id: 'Pointers', name: 'Pointers' }
];

// Prerequisite spine: which topic has to land before which. These are the edges
// that carry the shape of the course.
export const PREREQS: [string, string][] = [
  ['Variables', 'I/O'], // you print and read variables; both are week 1
  ['Variables', 'Expressions'], // arithmetic acts on typed variables -- int/int is the trap
  ['Expressions', 'Conditionals'], // a condition is an expression that evaluates true/false
  ['Expressions', 'Loops'], // counters and accumulators: i++, sum += x
  ['Conditionals', 'Loops'], // a while loop is an if that repeats
  ['Variables', 'Functions'], // parameters and locals are variables with scope
  ['Functions', 'Pointers'] // pass-by-reference exists to fix what functions can't do
];

// CCPROG1 subtopics (small nodes). Six labels appear under two topics; each one
// is a concept that really does live in both places:
//   Format Specifiers  Variables + I/O   %d exists because the variable is an int
//   #include           I/O + Functions   stdio.h for printf, math.h for sqrt
//   Scope              Variables + Fns   local vs global only matters once fns exist
//   & Address-of       I/O + Pointers    the & typed into scanf since week 1, explained
//   Relational Ops     Conds + Loops     i < n is why week 3 precedes week 7
//   Modulo %           Exprs + Conds     n % 2 == 0, the even/odd exercise
export const RELATIONS: Record<string, string[]> = {
  Variables: ['Data Types', 'Format Specifiers', 'Scope'],
  'I/O': ['printf()', 'scanf()', 'Format Specifiers', '#include', '& Address-of'],
  Expressions: ['Arithmetic Ops', 'Precedence', 'Integer Division', 'Modulo %'],
  Conditionals: ['Relational Ops', 'Logical Ops', 'if / else', 'switch', 'Modulo %'],
  Functions: ['Prototype', 'Parameters', 'Return Value', 'Scope', '#include'],
  Loops: ['while', 'for', 'do-while', 'Nested Loops', 'Relational Ops'],
  Pointers: ['& Address-of', '* Dereference', 'Pass by Value', 'Pass by Reference']
};

// Anchors run the spine top-left to bottom-right with few crossings. Note that
// buildNodes() only keeps SUBTOPICS out of the headline zone (x < 44 && y > 56),
// so topic anchors have to steer clear of it by hand.
export const TOPIC_ANCHORS: Record<string, [number, number]> = {
  Variables: [26, 20],
  'I/O': [50, 12],
  Functions: [76, 22],
  Pointers: [86, 44],
  Expressions: [30, 42],
  Conditionals: [52, 52],
  Loops: [62, 74]
};
