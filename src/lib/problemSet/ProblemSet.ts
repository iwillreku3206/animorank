import type { ProblemSet as ProblemSetModel } from '$lib/zenstack/models';
import type { Tag } from '$lib/zenstack/models';

export interface CollaboratorInfo {
  id: string;
  name: string | null;
}

export interface ProblemSetSummary {
  id: string;
  title: string;
  description?: string;
  auto_accept: boolean;
  is_global: boolean;
  subject?: Tag;
  difficulty?: Tag;
  topics: Tag[];
  authors: { id: string; name: string }[];
  problemCount: number;
  bookmarked?: boolean;
}

export class ProblemSet {
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly model: ProblemSetModel) {}

  get id(): string {
    return this.model.id;
  }

  get title(): string {
    return this.model.title;
  }

  get description(): string | null {
    return this.model.description;
  }

  get auto_accept(): boolean {
    return this.model.auto_accept;
  }

  get is_global(): boolean {
    return this.model.is_global;
  }

  get created_at(): Date {
    return this.model.created_at;
  }

  get updated_at(): Date {
    return this.model.updated_at;
  }
}
