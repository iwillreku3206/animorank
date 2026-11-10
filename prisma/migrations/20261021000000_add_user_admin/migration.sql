/*
  Adds `User.admin`: the operator flag the analytics pages are gated on.

  Analytics is a view across every class in the course, so being a teacher is
  not enough to see it — a teacher account needs this flag, which the app cannot
  grant itself (see `scripts/setTeacherAdmin.ts`, the only writer).

  `NOT NULL DEFAULT false` backfills every existing row: the flag is granted
  deliberately, so nobody holds it until an operator sets it.
*/

ALTER TABLE "User" ADD COLUMN "admin" BOOLEAN NOT NULL DEFAULT false;
