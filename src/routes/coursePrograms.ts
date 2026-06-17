// Stylized, syllabus-flavored problems for the /about IDE-window demo. Each
// course shows a problem at roughly its real level — a first-year loop for
// CCPROG1, Java inheritance for CCPROG3 — so a visitor sees their own course's
// kind of work. Tokens drive the fake syntax highlighting:
//   k = keyword (accent), f = function (primary), v = variable (base-content),
//   n = number (info), p = plain (muted). See AutograderDemo.svelte.

export type Token = [kind: string, text: string];
export type CodeLine = Token[];
export type Example = { input: string; output: string };

export type CourseProgram = {
  /** Problem title shown in the spec pane. */
  title: string;
  /** Editor "file name", e.g. Shapes.java — also feeds the tab extension. */
  filename: string;
  /** One-line problem statement (rendered in the spec pane). */
  statement: string;
  /** Worked example(s). */
  examples: Example[];
  /** Short constraint / note. */
  note?: string;
  /** Tokenized source lines. */
  code: CodeLine[];
  /** Graded test-case labels (the app shows "Case N"). */
  cases: string[];
};

export const coursePrograms: Record<string, CourseProgram> = {
  // CCPROG1 — Logic Formulation & Intro Programming: conditionals + loops (C).
  CCPROG1: {
    title: 'Count Passing Scores',
    filename: 'passing.c',
    statement: 'Return how many students passed. A score of 60 or above is a passing mark.',
    examples: [{ input: 'scores = [55, 60, 72, 40]', output: '2' }],
    note: '1 ≤ n ≤ 1000',
    code: [
      [
        ['k', 'int '],
        ['f', 'countPassing'],
        ['p', '(int scores[], int n) {']
      ],
      [
        ['p', '  int '],
        ['v', 'passed '],
        ['p', '= '],
        ['n', '0'],
        ['p', ';']
      ],
      [
        ['k', '  for '],
        ['p', '(int i = '],
        ['n', '0'],
        ['p', '; i < n; i++) {']
      ],
      [
        ['k', '    if '],
        ['p', '(scores[i] >= '],
        ['n', '60'],
        ['p', ') {']
      ],
      [['p', '      passed++;']],
      [['p', '    }']],
      [['p', '  }']],
      [
        ['k', '  return '],
        ['v', 'passed'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: [
      'empty class',
      'all passing',
      'all failing',
      'exactly 60',
      'mixed grades',
      'single student',
      'large class'
    ]
  },

  // CCPROG2 — Programming with Structured Data Types: pointers (C).
  CCPROG2: {
    title: 'Swap with Pointers',
    filename: 'swap.c',
    statement: 'Swap the values pointed to by a and b in place, using pointers.',
    examples: [{ input: 'a = 3, b = 8', output: 'a = 8, b = 3' }],
    note: 'Modify the values through the pointers.',
    code: [
      [
        ['k', 'void '],
        ['f', 'swap'],
        ['p', '(int *a, int *b) {']
      ],
      [
        ['p', '  int '],
        ['v', 'temp '],
        ['p', '= *a;']
      ],
      [['p', '  *a = *b;']],
      [['p', '  *b = temp;']],
      [['p', '}']]
    ],
    cases: [
      'distinct values',
      'equal values',
      'negatives',
      'zero and value',
      'large values',
      'min and max'
    ]
  },

  // CCPROG3 — Object-Oriented Design & Programming: abstraction + inheritance (Java).
  CCPROG3: {
    title: 'Area via Inheritance',
    filename: 'Shapes.java',
    statement:
      'Implement Circle as a subclass of the abstract Shape, overriding area() to return π·r².',
    examples: [{ input: 'r = 2.0', output: '12.566' }],
    note: 'Circle must extend Shape.',
    code: [
      [
        ['k', 'abstract '],
        ['k', 'class '],
        ['f', 'Shape'],
        ['p', ' {']
      ],
      [
        ['k', '  abstract '],
        ['k', 'double '],
        ['f', 'area'],
        ['p', '();']
      ],
      [['p', '}']],
      [
        ['k', 'class '],
        ['f', 'Circle'],
        ['k', ' extends '],
        ['f', 'Shape'],
        ['p', ' {']
      ],
      [
        ['k', '  double '],
        ['v', 'r'],
        ['p', ';']
      ],
      [
        ['k', '  double '],
        ['f', 'area'],
        ['p', '() {']
      ],
      [
        ['k', '    return '],
        ['v', 'Math'],
        ['p', '.PI * r * r;']
      ],
      [['p', '  }']],
      [['p', '}']]
    ],
    cases: [
      'zero radius',
      'unit circle',
      'large radius',
      'area is positive',
      'overrides area',
      'extends Shape'
    ]
  },

  // CSALGCM — Algorithms and Complexity: binary search (C).
  CSALGCM: {
    title: 'Binary Search',
    filename: 'search.c',
    statement:
      'Return the index of key in the sorted array a, or −1 if it is absent. Aim for O(log n).',
    examples: [{ input: 'a = [1, 3, 5, 7, 9], key = 7', output: '3' }],
    note: 'a is sorted ascending.',
    code: [
      [
        ['k', 'int '],
        ['f', 'search'],
        ['p', '(int a[], int n, int key) {']
      ],
      [
        ['p', '  int '],
        ['v', 'lo '],
        ['p', '= '],
        ['n', '0'],
        ['p', ', '],
        ['v', 'hi '],
        ['p', '= n - '],
        ['n', '1'],
        ['p', ';']
      ],
      [
        ['k', '  while '],
        ['p', '(lo <= hi) {']
      ],
      [
        ['p', '    int mid = (lo + hi) / '],
        ['n', '2'],
        ['p', ';']
      ],
      [
        ['k', '    if '],
        ['p', '(a[mid] == key) '],
        ['k', 'return '],
        ['v', 'mid'],
        ['p', ';']
      ],
      [
        ['k', '    if '],
        ['p', '(a[mid] < key) lo = mid + '],
        ['n', '1'],
        ['p', ';']
      ],
      [
        ['k', '    else '],
        ['p', 'hi = mid - '],
        ['n', '1'],
        ['p', ';']
      ],
      [['p', '  }']],
      [
        ['k', '  return '],
        ['p', '-'],
        ['n', '1'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: [
      'empty array',
      'single element',
      'key at start',
      'key in middle',
      'key at end',
      'key not present',
      'duplicate keys',
      'large input'
    ]
  },

  // CSINTSY — Introduction to Intelligent Systems: A* heuristic (C).
  CSINTSY: {
    title: 'Manhattan Distance',
    filename: 'heuristic.c',
    statement:
      'Return the Manhattan distance from (x, y) to the goal (gx, gy) — the grid heuristic for A*.',
    examples: [{ input: '(1, 2) → (4, 4)', output: '5' }],
    note: '|dx| + |dy|',
    code: [
      [
        ['k', 'int '],
        ['f', 'heuristic'],
        ['p', '(int x, int y, int gx, int gy) {']
      ],
      [
        ['p', '  int '],
        ['v', 'dx '],
        ['p', '= '],
        ['f', 'abs'],
        ['p', '(x - gx);']
      ],
      [
        ['p', '  int '],
        ['v', 'dy '],
        ['p', '= '],
        ['f', 'abs'],
        ['p', '(y - gy);']
      ],
      [
        ['k', '  return '],
        ['p', 'dx + dy;']
      ],
      [['p', '}']]
    ],
    cases: [
      'same cell',
      'adjacent cells',
      'straight line',
      'diagonal path',
      'far apart',
      'origin to goal'
    ]
  }
};
