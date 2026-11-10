/**
 * Grants or revokes the operator flag that gates the analytics pages.
 *
 * Analytics spans every class in the course, so a teacher account reaches it
 * only with `User.admin` set — and nothing in the app can set that flag for
 * itself: it is absent from every request validator and from the session
 * callback, which only reads it. This script (and SQL by hand) are the only
 * writers. See the column comment in src/zenstack/user.zmodel and the guard in
 * src/routes/instructor/analytics/+layout.server.ts.
 *
 * The account has to exist and has to be a teacher: the flag on a student
 * account grants nothing (`canViewAnalytics` refuses non-teachers anyway), and
 * silently doing nothing is worse than saying so.
 */
import { db } from '../src/lib/zenstack.ts';

const USAGE = `Usage:
  npm run scripts:setTeacherAdmin -- list
  npm run scripts:setTeacherAdmin -- grant <email>
  npm run scripts:setTeacherAdmin -- revoke <email>

Only teacher accounts can hold the flag, and only holders can open Analytics.`;

/** A problem with the command line rather than with the database. */
class UsageError extends Error {}

async function list(): Promise<void> {
  const teachers = await db.teacher.findMany({
    select: { user: { select: { email: true, name: true, admin: true } } },
    orderBy: { user: { email: 'asc' } }
  });

  if (teachers.length === 0) {
    console.log('No teacher accounts.');
    return;
  }

  console.log('Teacher accounts:');
  for (const { user } of teachers) {
    console.log(`  ${user.admin ? 'admin ' : '      '} ${user.email}${user.name ? `  (${user.name})` : ''}`);
  }
}

async function setAdmin(email: string, admin: boolean): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, teacher: { select: { id: true } }, admin: true }
  });

  if (!user) throw new Error(`No account is registered with ${email}.`);
  if (!user.teacher) throw new Error(`${email} is not a teacher account, so it cannot hold the flag.`);

  if (user.admin === admin) {
    console.log(`${email} already ${admin ? 'holds' : 'does not hold'} the flag.`);
    return;
  }

  await db.user.update({ where: { id: user.id }, data: { admin } });
  console.log(`${email} ${admin ? 'can now' : 'can no longer'} open Analytics.`);
}

async function main(): Promise<void> {
  const [command, email] = process.argv.slice(2);

  switch (command) {
    case 'list':
      await list();
      return;
    case 'grant':
      if (!email) throw new UsageError('grant needs an email address.');
      await setAdmin(email.trim().toLowerCase(), true);
      return;
    case 'revoke':
      if (!email) throw new UsageError('revoke needs an email address.');
      await setAdmin(email.trim().toLowerCase(), false);
      return;
    default:
      throw new UsageError(USAGE);
  }
}

await main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error instanceof UsageError ? error.message : error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
