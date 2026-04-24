import { ClientContract } from '@zenstackhq/orm';
import { db as _db } from '../src/lib/zenstack.ts';
import { schema } from '../src/lib/zenstack/schema.ts';
import { TagType, TagColor } from '../src/lib/zenstack/models.ts';

async function createTag(name: string, type: TagType, color?: TagColor, order?: number) {
  const db = _db as ClientContract<typeof schema>;
  await db.tag.upsert({
    where: { label: name },
    create: { label: name, type, color, order },
    update: {}
  });
}

async function execute() {
  Promise.all([
    createTag('I/O', TagType.TAG_TOPIC),
    createTag('Data Types', TagType.TAG_TOPIC),
    createTag('Arithmetic', TagType.TAG_TOPIC),
    createTag('Loops', TagType.TAG_TOPIC),
    createTag('Functions', TagType.TAG_TOPIC),
    createTag('Conditions', TagType.TAG_TOPIC),
    createTag('Strings', TagType.TAG_TOPIC),
    createTag('Arrays', TagType.TAG_TOPIC),
    createTag('Structs', TagType.TAG_TOPIC),
    createTag('Files', TagType.TAG_TOPIC),
    createTag('Sorting', TagType.TAG_TOPIC),
    createTag('Graphs', TagType.TAG_TOPIC),
    createTag('Search', TagType.TAG_TOPIC),
    createTag('Trees', TagType.TAG_TOPIC),
    createTag('Stacks', TagType.TAG_TOPIC),
    createTag('Queues', TagType.TAG_TOPIC),
    createTag('Algorithms', TagType.TAG_TOPIC),
    createTag('Debugging', TagType.TAG_TOPIC),
    createTag('Divide and Conquer', TagType.TAG_TOPIC),
    createTag('Dynamic Programming', TagType.TAG_TOPIC),
    createTag('Greedy Algorithms', TagType.TAG_TOPIC),

    createTag('CCPROG1', TagType.TAG_SUBJECT),
    createTag('CCPROG2', TagType.TAG_SUBJECT),
    createTag('CCPROG3', TagType.TAG_SUBJECT),
    createTag('CSALGCM', TagType.TAG_SUBJECT),
    createTag('CSINTSY', TagType.TAG_SUBJECT),

    createTag('Basic', TagType.TAG_DIFFICULTY, TagColor.TAG_COLOR_GREEN, 1),
    createTag('Intermediate', TagType.TAG_DIFFICULTY, TagColor.TAG_COLOR_YELLOW, 2),
    createTag('Advanced', TagType.TAG_DIFFICULTY, TagColor.TAG_COLOR_RED, 3)
  ]);
}

if (import.meta.main) {
  execute();
}
