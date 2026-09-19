/**
 * Curates the featured lineup on the problem set catalogue.
 *
 * Featuring is an operator action, not something a collaborator can do from the
 * editor: `featured_rank` is deliberately absent from the problem set's PUT
 * validator, so this script is its only writer. See the column comment in
 * src/zenstack/problemSet.zmodel.
 *
 * Featured sets lead the catalogue's *default* listing only. The moment a user
 * picks a sort, their sort wins outright and featured sets fall back into their
 * natural position.
 */
import { db } from '../src/lib/zenstack.ts';

const USAGE = `Usage:
  npm run scripts:featureProblemSet -- list
  npm run scripts:featureProblemSet -- set <problemSetId> <rank>
  npm run scripts:featureProblemSet -- unset <problemSetId>

Ranks order the lineup ascending and need not be contiguous. Space them by 10,
so a set can later be slipped between two others without renumbering the rest.`;

/** A problem with the command line rather than with the database. */
class UsageError extends Error {}

/** Print the current lineup, in the order the catalogue will render it. */
async function list(): Promise<void> {
  const featured = await db.problemSet.findMany({
    where: { featured_rank: { not: null } },
    orderBy: { featured_rank: 'asc' },
    select: { id: true, title: true, featured_rank: true }
  });

  if (featured.length === 0) {
    console.log('No problem sets are featured.');
    return;
  }

  console.log(`Featured lineup (${featured.length}):`);
  console.log('  rank  id                                    title');
  for (const ps of featured) {
    console.log(`  ${String(ps.featured_rank).padStart(4)}  ${ps.id}  ${ps.title}`);
  }
}

/** Feature a set at the given rank, or move an already-featured one. */
async function set(id: string, rawRank: string): Promise<void> {
  const rank = Number(rawRank);
  if (!Number.isInteger(rank)) {
    throw new UsageError(`Rank must be a whole number, got "${rawRank}".`);
  }

  const existing = await db.problemSet.findUnique({
    where: { id },
    select: { title: true, featured_rank: true }
  });
  if (!existing) throw new UsageError(`No problem set with id ${id}.`);

  await db.problemSet.update({ where: { id }, data: { featured_rank: rank } });

  console.log(
    existing.featured_rank === null
      ? `Featured "${existing.title}" at rank ${rank}.`
      : `Moved "${existing.title}" from rank ${existing.featured_rank} to rank ${rank}.`
  );

  // Nothing in the schema stops two sets sharing a rank, but a tie hands the
  // ordering to the catalogue's author-then-title tiebreak rather than to the
  // curator. Say so here rather than letting it pass unnoticed.
  const clashes = await db.problemSet.findMany({
    where: { featured_rank: rank, id: { not: id } },
    select: { id: true, title: true }
  });
  if (clashes.length > 0) {
    console.warn(`Warning: rank ${rank} is also held by:`);
    for (const clash of clashes) console.warn(`  ${clash.id}  ${clash.title}`);
    console.warn("Ties fall back to the catalogue's author-then-title order.");
  }
}

/** Remove a set from the lineup. */
async function unset(id: string): Promise<void> {
  const existing = await db.problemSet.findUnique({
    where: { id },
    select: { title: true, featured_rank: true }
  });
  if (!existing) throw new UsageError(`No problem set with id ${id}.`);

  if (existing.featured_rank === null) {
    console.log(`"${existing.title}" is already not featured.`);
    return;
  }

  await db.problemSet.update({ where: { id }, data: { featured_rank: null } });
  console.log(`Unfeatured "${existing.title}" (was rank ${existing.featured_rank}).`);
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  switch (command) {
    case 'list':
      if (rest.length > 0) throw new UsageError('`list` takes no arguments.');
      return list();
    case 'set':
      if (rest.length !== 2) throw new UsageError('`set` takes <problemSetId> <rank>.');
      return set(rest[0], rest[1]);
    case 'unset':
      if (rest.length !== 1) throw new UsageError('`unset` takes <problemSetId>.');
      return unset(rest[0]);
    default:
      throw new UsageError(command ? `Unknown command "${command}".` : 'No command given.');
  }
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      console.error(`\n${USAGE}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    // The pg Pool keeps the event loop alive, so a one-shot script has to close it.
    await db.$disconnect();
  }
}
