// FAQ content for /faqs. Answers are arrays of "parts" so links can live in
// data without resorting to {@html}: a part is either a plain string or a link
// object. The page renders strings as text and link parts as anchors.

export type AnswerLink = {
  text: string;
  href: string;
  /** Open in a new tab (adds target=_blank + rel). Use for off-site links. */
  external?: boolean;
};

export type AnswerPart = string | AnswerLink;

export type Faq = {
  q: string;
  a: AnswerPart[];
};

export type FaqSection = {
  heading: string;
  items: Faq[];
};

export const faqSections: FaqSection[] = [
  {
    heading: 'Getting Started',
    items: [
      {
        q: 'What is AnimoRank?',
        a: [
          'A free practice site for DLSU Computer Science courses. You solve programming problems right in your browser and your code runs against test cases the moment you submit, so you find out what works and what does not without waiting on anyone.'
        ]
      },
      {
        q: 'Is it free?',
        a: [
          'Yes, completely. No paywall, no premium tier, no ads. AnimoRank is an open source project.'
        ]
      },
      {
        q: 'Is this an official DLSU platform?',
        a: [
          'No. AnimoRank is an independent project built by DLSU students. It is not run, owned, or officially endorsed by De La Salle University. We build it because we wanted the practice tool we wished we had.'
        ]
      },
      {
        q: 'How do I sign in?',
        a: [
          'Use your DLSU Google account. Access is limited to DLSU accounts only. The problems are built around the DLSU CS syllabus, so we are keeping it scoped to the students it is made for.'
        ]
      }
    ]
  },
  {
    heading: 'Practicing',
    items: [
      {
        q: 'What courses are covered?',
        a: [
          'Right now, we only cover CCPROG1 through the C programming language. However, more courses are on the way.'
        ]
      },
      {
        q: 'How does the feedback work?',
        a: [
          'When you submit, your code is compiled and run against a set of test cases. You see which cases passed, which failed, and the output, so you can spot the gap between what your program does and what the problem asked for.'
        ]
      },
      {
        q: 'Can I use it to study for a specific exam?',
        a: [
          'That is the idea! Filter by topic and difficulty, pull up everything on the thing you are weak at, and work a focused set. Studying pointers this week? Try out every pointer problem and go.'
        ]
      }
    ]
  },
  {
    heading: 'Accounts, Integrity & Beta',
    items: [
      {
        q: 'Will my progress be saved?',
        a: [
          'Your progress is tied to your account. We only collect what is needed to run the site and track your practice; see our ',
          { text: 'Privacy Policy', href: '/legal/privacy-policy' },
          ' for the details.'
        ]
      },
      {
        q: 'Is using AnimoRank cheating?',
        a: [
          'No. It is practice, like working through extra exercises on your own. But it does not replace your course’s rules. If something is for a graded requirement, follow your instructor’s policy on outside tools and collaboration. AnimoRank is here to help you actually learn the material, not to shortcut it.'
        ]
      },
      {
        q: 'This is a beta — what does that mean?',
        a: [
          'The site is real and usable, but it is still actively being built. Expect occasional rough edges, the odd bug, and changes between visits. More courses, problems, and features are on the way. Found a bug or have an idea? ',
          {
            text: 'Open an issue on GitHub',
            href: 'https://github.com/iwillreku3206/animorank/issues/new?template=bug_report.md&labels=bug',
            external: true
          },
          '. Reports from students are how this gets better.'
        ]
      }
    ]
  }
];
