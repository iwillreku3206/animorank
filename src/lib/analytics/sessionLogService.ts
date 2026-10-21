import { z } from 'zod';
import { db } from '$lib/zenstack';
import { buildSessionLogDocument } from './sessionLogDocument';
import type { SessionLogDocument, SessionLogEntry, SessionLogProblem, SessionLogProblemSet } from './sessionLogView';

export interface SessionLogSelection {
  set: string | null;
  problem: string | null;
  user: string | null;
  session: string | null;
  type: string | null;
}

export interface SessionLogsData {
  problemSets: { id: string; title: string }[];
  problems: { id: string; name: string }[];
  users: string[];
  sessions: string[];
  types: string[];
  logs: SessionLogEntry[];
  problem: SessionLogProblem | null;
  problemSet: SessionLogProblemSet | null;
  document: SessionLogDocument | null;
  selected: SessionLogSelection;
}

const uuidParam = z.uuid().nullable().catch(null);

export class SessionLogService {
  /**
   * The cascading session-log picker and the log rows it selects.
   *
   * Every level is validated against the level above it, so a hand-edited or
   * stale URL (an id from another problem set, a non-UUID, a session that
   * belongs to a different student) silently falls back to the nearest valid
   * ancestor instead of erroring or leaking unrelated rows.
   */
  public async getSessionLogs(selection: SessionLogSelection): Promise<SessionLogsData> {
    const rawSet = uuidParam.parse(selection.set);
    const rawProblem = uuidParam.parse(selection.problem);
    const rawUser = uuidParam.parse(selection.user);
    const rawSession = uuidParam.parse(selection.session);
    const rawType = selection.type || null;

    const [problemSets, typeRows] = await Promise.all([
      db.problemSet.findMany({
        select: { id: true, title: true },
        orderBy: { title: 'asc' }
      }),
      db.sessionHistoryEntry.findMany({
        distinct: ['type'],
        select: { type: true },
        orderBy: { type: 'asc' }
      })
    ]);

    const validSet = problemSets.some((s) => s.id === rawSet) ? rawSet : null;
    const problems = validSet
      ? await db.problem.findMany({
          where: { problem_set_id: validSet },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        })
      : [];
    const validProblem = problems.some((p) => p.id === rawProblem) ? rawProblem : null;
    const users = validProblem
      ? await db.practiceSession.findMany({
          where: { problem_id: validProblem },
          distinct: ['student_id'],
          select: { student_id: true },
          orderBy: { student_id: 'asc' }
        })
      : [];
    const validUser = users.some((u) => u.student_id === rawUser) ? rawUser : null;
    const sessions =
      validProblem && validUser
        ? await db.practiceSession.findMany({
            where: { problem_id: validProblem, student_id: validUser },
            select: { id: true },
            orderBy: { created_at: 'desc' }
          })
        : [];
    // A log view describes one practice session, so nothing is listed until one
    // is selected: a partial selection only narrows the pickers below it.
    const validSession = sessions.some((s) => s.id === rawSession) ? rawSession : null;
    const validType = typeRows.some((t) => t.type === rawType) ? rawType : null;

    const logs = validSession
      ? await db.sessionHistoryEntry.findMany({
          where: { practice_session_id: validSession, ...(validType ? { type: validType } : {}) },
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          select: { id: true, timestamp: true, type: true, data: true }
        })
      : [];

    const session = validSession
      ? await db.practiceSession.findUnique({
          where: { id: validSession },
          select: {
            previous_state: true,
            problem: {
              select: {
                id: true,
                name: true,
                description: true,
                starter_code: true,
                uses_slots: true,
                language: true,
                problem_set: { select: { id: true, title: true, description: true } }
              }
            }
          }
        })
      : null;

    // `previous_state` is the session's stored `{ code: Record<slotLabel, string> }`
    // (see `PracticeSession.getPreviousState`); anything else is treated as empty.
    const sections = z
      .object({ code: z.record(z.string(), z.string()) })
      .catch({ code: {} })
      .parse(session?.previous_state ?? {}).code;

    return {
      problemSets,
      problems,
      users: users.map((u) => u.student_id),
      sessions: sessions.map((s) => s.id),
      types: typeRows.map((t) => t.type),
      logs: logs.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })),
      problem: session
        ? {
            id: session.problem.id,
            name: session.problem.name,
            description: session.problem.description,
            language: session.problem.language
          }
        : null,
      problemSet: session
        ? {
            id: session.problem.problem_set.id,
            title: session.problem.problem_set.title,
            description: session.problem.problem_set.description ?? ''
          }
        : null,
      document: session
        ? buildSessionLogDocument({
            starterCode: session.problem.starter_code,
            usesSlots: session.problem.uses_slots,
            sections
          })
        : null,
      selected: {
        set: validSet,
        problem: validProblem,
        user: validUser,
        session: validSession,
        type: validType
      }
    };
  }
}
