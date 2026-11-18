/*
  Orders a session's history by write order rather than by client clocks.

  `timestamp` is client-side milliseconds and `id` is a random UUID, so two
  entries from one recorder tick tie and their id tiebreak is arbitrary. The
  replay applies pre-change offsets, so a swap corrupts the document.

  `sequence` is assigned by Postgres in INSERT order; the client flushes one
  batch per request and `createMany` writes one multi-row INSERT, so a
  batch's order is preserved.

  Existing rows are renumbered in the order they were displayed in
  (timestamp, then id). That is deterministic, but cannot recover the true
  order of same-millisecond rows written before this column existed.
*/
ALTER TABLE "SessionHistoryEntry" ADD COLUMN "sequence" BIGSERIAL NOT NULL;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "practice_session_id"
      ORDER BY "timestamp" ASC, "id" ASC
    ) AS "sequence"
  FROM "SessionHistoryEntry"
)
UPDATE "SessionHistoryEntry" AS entry
SET "sequence" = numbered."sequence"
FROM numbered
WHERE entry."id" = numbered."id";
