// Topic/subtopic data for the HeroGraph landing-page web. Big nodes are CCPROG1
// topics; small nodes are their subtopics. Pulled out of HeroGraph.svelte the
// same way coursePrograms.ts is pulled out of the autograder demo, so the data
// is editable on its own without touching the graph's layout/render logic.

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

// CCPROG1 topics (big nodes)
export const TOPICS: Topic[] = [
  { id: 'Variables', name: 'Variables' },
  { id: 'I/O', name: 'I/O' },
  { id: 'Functions', name: 'Functions' },
  { id: 'Conditionals', name: 'Conditionals' },
  { id: 'Loops', name: 'Loops' }
];

// CCPROG1 subtopics (small nodes)
export const RELATIONS: Record<string, string[]> = {
  Variables: ['Data Types', 'Literals', 'Assignment', 'Operators', 'Precedence'],
  'I/O': ['printf()', 'scanf()', 'Format Specifiers', '#include', 'main()'],
  Functions: ['main()', 'Prototypes', 'Parameters', 'Return Values', 'Pass by Reference'],
  Conditionals: ['Operators', 'Relational', 'Logical', 'if / else', 'Nesting'],
  Loops: ['while', 'for', 'do-while', 'Nesting', 'Break / Continue']
};

export const TOPIC_ANCHORS: Record<string, [number, number]> = {
  Variables: [24, 18],
  'I/O': [70, 16],
  Functions: [76, 44],
  Conditionals: [30, 42],
  Loops: [52, 58]
};
