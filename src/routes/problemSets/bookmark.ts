import { errorFrom } from '$lib/response';

export async function toggleBookmark(problemSetId: string): Promise<boolean> {
  const res = await fetch(`/api/problem-set/${problemSetId}/bookmark`, {
    method: 'POST'
  });

  if (!res.ok) throw await errorFrom(res, 'Failed to bookmark');

  return true;
}

export async function removeBookmark(problemSetId: string): Promise<boolean> {
  const res = await fetch(`/api/problem-set/${problemSetId}/bookmark`, {
    method: 'DELETE'
  });

  if (!res.ok) throw await errorFrom(res, 'Failed to remove bookmark');

  return false;
}
