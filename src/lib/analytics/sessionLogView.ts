import type { JsonValue } from '@zenstackhq/orm';

/** One `SessionHistoryEntry`, as the log views consume it. */
export interface SessionLogEntry {
  id: string;
  timestamp: string;
  type: string;
  data: JsonValue | null;
}

/** The problem the selected session was practicing. */
export interface SessionLogProblem {
  id: string;
  name: string;
  description: string;
  language: string;
}

/** The problem set that problem belongs to. */
export interface SessionLogProblemSet {
  id: string;
  title: string;
  description: string;
}

/** One slot of the problem's slot template. */
export interface SessionLogSlot {
  label: string;
  /** 1-indexed `[startLine, startColumn, endLine, endColumn]` inside {@link SessionLogDocument.baseCode}. */
  range: [number, number, number, number];
  /** The slot's code as the template itself carries it. */
  code: string;
  /** The slot's code as this session's last save holds it, or `null` when it was never saved. */
  savedCode: string | null;
}

/**
 * The code document behind a session, assembled from the problem's slots system
 * with the same parser the solve editor uses (`$lib/utils/parseSlots`): the
 * template's `%slot …%` / `%endslot …%` markers are stripped and each slot's
 * code is spliced in, with `\r\n` normalized to `\n`.
 */
export interface SessionLogDocument {
  /** The problem's `starter_code` verbatim, markers included. */
  template: string;
  usesSlots: boolean;
  /** What a fresh attempt starts from: the template with its own slot contents, or `''` for a non-slot problem. */
  baseCode: string;
  /** What this session's saved sections assemble to (equals `baseCode` when nothing was saved). */
  savedCode: string;
  /** One entry per template slot, in template order; empty for a non-slot problem. */
  slots: SessionLogSlot[];
}
