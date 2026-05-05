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
  bookmarked: boolean;
  progress: {
    finished: number;
    total: number;
  };
  subject?: Tag;
  tags: Tag[];
}
