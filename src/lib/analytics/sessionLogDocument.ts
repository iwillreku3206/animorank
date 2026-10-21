import { parseSlots } from '$lib/utils/parseSlots';
import type { SessionLogDocument } from './sessionLogView';

/**
 * The document a session's logs describe: the problem's slot template assembled
 * two ways — as a fresh attempt starts it (`baseCode`) and as the session's
 * saved per-slot code leaves it (`savedCode`).
 */
export function buildSessionLogDocument(problem: {
  starterCode: string;
  usesSlots: boolean;
  sections: Record<string, string>;
}): SessionLogDocument {
  if (!problem.usesSlots) {
    // A non-slot problem's editor holds the `body` section alone; `starter_code`
    // is not read for it (see `PracticeSession.previousCode`).
    const saved = problem.sections['body'] ?? '';
    return {
      template: problem.starterCode,
      usesSlots: false,
      baseCode: '',
      savedCode: saved,
      slots: []
    };
  }

  const fresh = parseSlots(problem.starterCode);
  const saved = parseSlots(problem.starterCode, problem.sections);
  const savedByLabel = new Map(saved.sections.map((section) => [section.slot.label, section.code]));

  return {
    template: problem.starterCode,
    usesSlots: true,
    baseCode: fresh.fullCode,
    savedCode: saved.fullCode,
    slots: fresh.sections.map((section) => ({
      label: section.slot.label,
      range: section.slot.initialRange,
      code: section.code,
      savedCode: savedByLabel.get(section.slot.label) ?? null
    }))
  };
}
