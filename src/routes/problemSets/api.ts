export interface Filters {
  tags: string[];
  status: '' | 'not_started' | 'in_progress' | 'complete';
  creator?: string;
  bookmarked: boolean;
}
