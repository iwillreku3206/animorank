import { ClientContract } from '@zenstackhq/orm';
import { db as _db } from '../src/lib/zenstack.ts';
import { schema } from '../src/lib/zenstack/schema.ts';
import { TagType, TagColor } from '../src/lib/zenstack/models.ts';

async function createTag(name: string, type: TagType, color?: TagColor, order?: number) {
  const db = _db as ClientContract<typeof schema>;
  await db[
    {
      [TagType.TopicTag]: 'topicTag',
      [TagType.DifficultyTag]: 'difficultyTag',
      [TagType.SubjectTag]: 'subjectTag'
    }[type]
  ].upsert({
    where: { label: name },
    create: { label: name, color, order },
    update: {}
  });
}

async function execute() {
  Promise.all([
    createTag('I/O', TagType.TopicTag),
    createTag('Data Types', TagType.TopicTag),
    createTag('Arithmetic', TagType.TopicTag),
    createTag('Loops', TagType.TopicTag),
    createTag('Functions', TagType.TopicTag),
    createTag('Conditions', TagType.TopicTag),
    createTag('Strings', TagType.TopicTag),
    createTag('Arrays', TagType.TopicTag),
    createTag('Structs', TagType.TopicTag),
    createTag('Files', TagType.TopicTag),
    createTag('Sorting', TagType.TopicTag),
    createTag('Graphs', TagType.TopicTag),
    createTag('Search', TagType.TopicTag),
    createTag('Trees', TagType.TopicTag),
    createTag('Stacks', TagType.TopicTag),
    createTag('Queues', TagType.TopicTag),
    createTag('Algorithms', TagType.TopicTag),
    createTag('Debugging', TagType.TopicTag),
    createTag('Divide and Conquer', TagType.TopicTag),
    createTag('Dynamic Programming', TagType.TopicTag),
    createTag('Greedy Algorithms', TagType.TopicTag),

    createTag('CCPROG1', TagType.SubjectTag),
    createTag('CCPROG2', TagType.SubjectTag),
    createTag('CCPROG3', TagType.SubjectTag),
    createTag('CSALGCM', TagType.SubjectTag),
    createTag('CSINTSY', TagType.SubjectTag),

    createTag('Basic', TagType.DifficultyTag, TagColor.TAG_COLOR_GREEN, 1),
    createTag('Intermediate', TagType.DifficultyTag, TagColor.TAG_COLOR_YELLOW, 2),
    createTag('Advanced', TagType.DifficultyTag, TagColor.TAG_COLOR_RED, 3)
  ]);
}

if (import.meta.main) {
  execute();
}
