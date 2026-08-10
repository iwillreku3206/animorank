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
  title: string;
  filename: string;
  statement: string;
  examples: Example[];
  note?: string;
  code: CodeLine[];
  cases: string[];
};

// TEMPORARY: the autograder demo now mirrors the CCPROG1 topics defined in
// ./heroGraphNodes. The old multi-course programs are kept commented out below
// so the course view can be restored later.
/* --- OLD course programs (kept for restore) ---
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
--- end OLD course programs --- */

// CCPROG1 topic problems (keys match the topics in ./heroGraphNodes). Each shows
// work at roughly that topic's level, all in C since CCPROG1 is a C course.
export const coursePrograms: Record<string, CourseProgram> = {
  // Variables — literals, assignment, arithmetic operators & precedence.
  Variables: {
    title: 'Total Seconds',
    filename: 'time.c',
    statement: 'Convert a time given in hours, minutes, and seconds into the total number of seconds.',
    examples: [{ input: 'h = 1, m = 2, s = 3', output: '3723' }],
    note: 'total = h * 3600 + m * 60 + s',
    code: [
      [
        ['k', 'int '],
        ['f', 'totalSeconds'],
        ['p', '(int h, int m, int s) {']
      ],
      [
        ['p', '  int '],
        ['v', 'total '],
        ['p', '= h * '],
        ['n', '3600'],
        ['p', ' + m * '],
        ['n', '60'],
        ['p', ' + s;']
      ],
      [
        ['k', '  return '],
        ['v', 'total'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: ['all zero', 'only seconds', 'only minutes', 'one full hour', 'mixed h/m/s', 'large values']
  },

  // I/O — printf, scanf, format specifiers, #include, main.
  'I/O': {
    title: 'Greet a User',
    filename: 'greet.c',
    statement: 'Read a name and an age from input, then print a one-line greeting using them.',
    examples: [{ input: 'Ana 19', output: 'Hi Ana, you are 19!' }],
    note: 'one-token name, then an int age',
    code: [
      [
        ['k', '#include '],
        ['p', '<stdio.h>']
      ],
      [
        ['k', 'int '],
        ['f', 'main'],
        ['p', '() {']
      ],
      [
        ['p', '  char '],
        ['v', 'name'],
        ['p', '['],
        ['n', '32'],
        ['p', '];']
      ],
      [
        ['p', '  int '],
        ['v', 'age'],
        ['p', ';']
      ],
      [
        ['p', '  '],
        ['f', 'scanf'],
        ['p', '("%s %d", name, &age);']
      ],
      [
        ['p', '  '],
        ['f', 'printf'],
        ['p', '("Hi %s, you are %d!\\n", name, age);']
      ],
      [
        ['k', '  return '],
        ['n', '0'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: ['reads the name', 'reads the age', 'formats greeting', 'single-letter name', 'age is zero', 'exact spacing']
  },

  // Functions — prototype, parameters, return value.
  Functions: {
    title: 'Maximum of Two',
    filename: 'max.c',
    statement: 'Implement max(a, b) — a user-defined function returning the larger of two integers.',
    examples: [{ input: 'a = 3, b = 8', output: '8' }],
    note: 'prototype above the definition',
    code: [
      [
        ['k', 'int '],
        ['f', 'max'],
        ['p', '(int a, int b) {']
      ],
      [
        ['k', '  if '],
        ['p', '(a > b) '],
        ['k', 'return '],
        ['v', 'a'],
        ['p', ';']
      ],
      [
        ['k', '  return '],
        ['v', 'b'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: ['a greater', 'b greater', 'equal values', 'negatives', 'mixed signs', 'large values']
  },

  // Conditionals — relational/equality operators, nested if.
  Conditionals: {
    title: 'Leap Year',
    filename: 'leap.c',
    statement: 'Return 1 if the year is a leap year, otherwise 0 — using nested conditions on divisibility.',
    examples: [
      { input: 'year = 2000', output: '1' },
      { input: 'year = 1900', output: '0' }
    ],
    note: 'div by 4, but centuries only when div by 400',
    code: [
      [
        ['k', 'int '],
        ['f', 'isLeap'],
        ['p', '(int year) {']
      ],
      [
        ['k', '  if '],
        ['p', '(year % '],
        ['n', '4'],
        ['p', ' == '],
        ['n', '0'],
        ['p', ') {']
      ],
      [
        ['k', '    if '],
        ['p', '(year % '],
        ['n', '100'],
        ['p', ' == '],
        ['n', '0'],
        ['p', ') {']
      ],
      [
        ['k', '      return '],
        ['p', 'year % '],
        ['n', '400'],
        ['p', ' == '],
        ['n', '0'],
        ['p', ';']
      ],
      [['p', '    }']],
      [
        ['k', '    return '],
        ['n', '1'],
        ['p', ';']
      ],
      [['p', '  }']],
      [
        ['k', '  return '],
        ['n', '0'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: ['common year', 'divisible by 4', 'century non-leap', '400 is leap', 'year 2024', 'year 1900']
  },

  // Loops — for loop with an accumulator.
  Loops: {
    title: 'Factorial',
    filename: 'factorial.c',
    statement: 'Return n! — the product of all integers from 1 to n, with 0! defined as 1.',
    examples: [{ input: 'n = 5', output: '120' }],
    note: '0! = 1',
    code: [
      [
        ['k', 'int '],
        ['f', 'factorial'],
        ['p', '(int n) {']
      ],
      [
        ['p', '  int '],
        ['v', 'result '],
        ['p', '= '],
        ['n', '1'],
        ['p', ';']
      ],
      [
        ['k', '  for '],
        ['p', '(int i = '],
        ['n', '2'],
        ['p', '; i <= n; i++) {']
      ],
      [['p', '    result *= i;']],
      [['p', '  }']],
      [
        ['k', '  return '],
        ['v', 'result'],
        ['p', ';']
      ],
      [['p', '}']]
    ],
    cases: ['zero', 'one', 'small n', 'n = 5', 'larger n', 'single step']
  }
};
