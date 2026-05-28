import { ServiceRegistry } from '$lib/services/registry';
import type { TagModel } from './tagModel';
import type { TagType } from '$lib/zenstack/models';
import { Tag } from './Tag';
import type { SubjectTagCreateOptions, SubjectTagUpdateOptions } from './SubjectTag';
import { SubjectTag } from './SubjectTag';
import type { DifficultyTagCreateOptions, DifficultyTagUpdateOptions } from './DifficultyTag';
import { DifficultyTag } from './DifficultyTag';
import type { TopicTagCreateOptions, TopicTagUpdateOptions } from './TopicTag';
import { TopicTag } from './TopicTag';

export type TagCreateOptions =
  | SubjectTagCreateOptions
  | DifficultyTagCreateOptions
  | TopicTagCreateOptions;
export type TagUpdateOptions =
  | SubjectTagUpdateOptions
  | DifficultyTagUpdateOptions
  | TopicTagUpdateOptions;

export class TagRegistry extends ServiceRegistry<
  Tag<TagModel>,
  [TagModel],
  {
    create(_options: TagCreateOptions): Promise<TagModel>;
    findById(_id: string): Promise<TagModel | null>;
    update(_id: string, _options: TagUpdateOptions): Promise<TagModel | null>;
    delete(_id: string): Promise<boolean>;
    findAll(): Promise<TagModel[]>;
  }
> {
  public constructor() {
    super();
    this.register('TAG_SUBJECT', SubjectTag);
    this.register('TAG_DIFFICULTY', DifficultyTag);
    this.register('TAG_TOPIC', TopicTag);
  }
}
