import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { TagService } from '$lib/tag';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();
  if (!session || !session.user.id) return redirect(302, '/');

  const problemSet = await db.problemSet.findUnique({
    where: {
      id: params.id,
      collaborators: { some: { collaborator_id: session.user.id } }
    },
    include: {
      problems: {
        orderBy: { created_at: 'asc' }
      },
      collaborators: {
        include: {
          collaborator: {
            include: { user: true }
          }
        }
      },
      difficulty: true,
      subject: true,
      topics: {
        include: { topic_tag: true }
      }
    }
  });

  if (!problemSet) return redirect(302, '/instructor/problemSets');

  const tagService = ServerServiceProvider.instance().getService(TagService);
  const allTags = await tagService.findAll();

  return {
    problemSet: {
      id: problemSet.id,
      title: problemSet.title,
      description: problemSet.description || '',
      auto_accept: problemSet.auto_accept,
      is_global: problemSet.is_global,
      subject_id: problemSet.subject?.id || null,
      difficulty_id: problemSet.difficulty?.id || null,
      topic_ids: problemSet.topics.map((t) => t.topic_tag_id),
      problems: problemSet.problems.map((p) => ({
        id: p.id,
        name: p.name,
        visible: p.visible,
        created_at: p.created_at
      })),
      collaboratorIds: problemSet.collaborators.map((c) => c.collaborator.user.id)
    },
    tags: allTags.map((t) => ({
      id: t.id,
      label: t.label,
      type: t.type
    }))
  };
};
