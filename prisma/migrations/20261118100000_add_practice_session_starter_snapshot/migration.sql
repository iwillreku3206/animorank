/*
  Freezes the template each session started from.

  Replays used to assemble their base from the problem's current
  `starter_code`; a teacher editing the template rebased every old session
  on a document the student never saw. The snapshot is the raw template,
  markers included, so slot labels, ranges and assembly stay consistent
  with the session's saved sections.

  Existing sessions have no record of their original template, so they are
  backfilled from the problem's current one and then frozen: exactly what
  the replay showed before, but no longer mutable.
*/
ALTER TABLE "PracticeSession" ADD COLUMN "starter_code_snapshot" TEXT;

UPDATE "PracticeSession"
SET "starter_code_snapshot" = "Problem"."starter_code"
FROM "Problem"
WHERE "Problem"."id" = "PracticeSession"."problem_id";

ALTER TABLE "PracticeSession" ALTER COLUMN "starter_code_snapshot" SET NOT NULL;
