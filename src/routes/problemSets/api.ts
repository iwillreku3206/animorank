import type { Tag } from '$lib/zenstack/models';

export interface Filters {
  tags: string[];
  status: '' | 'not_started' | 'in_progress' | 'complete';
  creator?: string;
  bookmarked: boolean;
}

export interface ProblemSet {
  id: string;
  title: string;
  ownerName: string;
  description: string;
  progress: {
    finished: number;
    total: number;
  };
  bookmarked: boolean;
  subject?: Tag;
  tags: Tag[];
}
