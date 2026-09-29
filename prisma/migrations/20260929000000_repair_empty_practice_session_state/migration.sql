/*
  Warnings:

  - Rewrites `PracticeSession.previous_state` rows that hold only the empty
    object, and gives a fresh attempt to a row whose state holds content this
    version cannot read.

  `previous_state` arrived in `20260511155046_switch_to_practice_session_state`
  as `JSONB NOT NULL DEFAULT '{}'`, on a table that already had rows. Every
  session the app has written since holds `{ "code": { ... } }` -- that is what
  `PracticeSessionService.create` and the practice-session PATCH write -- but a
  session that predates the column still holds the default.

  `PracticeSession.getCodeSection` reads `previous_state.code[section]`, so such
  a row throws on a problem that does not use slots: `previousCode` asks for the
  `body` section directly, and the TypeError reaches the run endpoints as a 500
  and the solve page's workspace as a context that never builds. Slot problems
  need no repair: `parseSlots` falls back to the template when there is no saved
  code, so the empty object already behaves exactly like a fresh attempt.

  Only the empty object is rewritten -- there is nothing in it to lose, and the
  value written is the one `create()` writes for a new session. A row that holds
  code is not touched at all, and neither is a row holding content that is not
  the current shape: that cannot be repaired without guessing what the content
  means, so those get a new session beside them instead.

*/

-- RepairData
-- The state a fresh session for this problem would have. `uses_slots = false`
-- only: the slot shape needs the slot grammar to build, which SQL does not have
-- (see the note above, and `parseSlots`).
UPDATE "PracticeSession" AS ps
SET previous_state = jsonb_build_object('code', jsonb_build_object('body', p.starter_code))
FROM "Problem" AS p
WHERE p.id = ps.problem_id
  AND p.uses_slots = false
  AND ps.previous_state = '{}'::jsonb;

-- ReplaceWithNewSession
-- Content this version cannot read: hand the student a usable attempt rather
-- than rewriting theirs. One per student and problem, and none at all when a
-- readable session for that problem already exists; scoped to
-- `uses_slots = false` for the same reason as the update above.
INSERT INTO "PracticeSession"
  (id, student_id, problem_id, done, created_at, updated_at, previous_state, extension_data)
SELECT DISTINCT ON (ps.student_id, ps.problem_id)
  gen_random_uuid(),
  ps.student_id,
  ps.problem_id,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  jsonb_build_object('code', jsonb_build_object('body', p.starter_code)),
  '{}'::jsonb
FROM "PracticeSession" AS ps
JOIN "Problem" AS p ON p.id = ps.problem_id
WHERE ps.previous_state <> '{}'::jsonb
  AND NOT (ps.previous_state ? 'code')
  AND p.uses_slots = false
  AND NOT EXISTS (
    SELECT 1
    FROM "PracticeSession" AS readable
    WHERE readable.student_id = ps.student_id
      AND readable.problem_id = ps.problem_id
      AND readable.previous_state ? 'code'
  );
