import type { TagModel } from './tagModel';
import type { TagColor, TagType } from '$lib/zenstack/models';
import { TagType as TAG_TYPE } from '$lib/zenstack/models';
import { TagRegistry } from './tagRegistry';
import type { Tag } from './Tag';
import type { TagCreateOptions, TagUpdateOptions } from './tagRegistry';

export interface FindByIdOptions {
  id: string;
  type: TagType;
}

export interface CreateOptions {
  type: TagType;
  label: string;
  color?: TagColor;
  order?: number;
}

export interface UpdateOptions {
  id: string;
  type: TagType;
  data: Partial<TagModel>;
}

export interface DeleteOptions {
  id: string;
  type: TagType;
}

export interface ListByTypeOptions {
  type: TagType;
}

export class TagService {
  private static _instance: TagService | null;
  private tagRegistry: TagRegistry;

  private constructor() {
    this.tagRegistry = new TagRegistry();
  }

  public static instance(): TagService {
    if (!TagService._instance) {
      TagService._instance = new TagService();
    }
    return TagService._instance;
  }

  public async create(options: CreateOptions): Promise<Tag<TagModel> | null> {
    const model = await this.tagRegistry.getStatic(options.type).create(options);
    return this.tagRegistry.getInstance(options.type, model);
  }

  public async findById(options: FindByIdOptions): Promise<Tag<TagModel> | null> {
    const cls = this.tagRegistry.getStatic(options.type);
    const model = await cls.findById(options.id);
    if (!model) return null;

    return this.tagRegistry.getInstance(options.type, model);
  }

  public async update(options: UpdateOptions): Promise<Tag<TagModel> | null> {
    const cls = this.tagRegistry.getStatic(options.type);
    const model = await cls.update(options.id, options as TagUpdateOptions);
    if (!model) return null;

    return this.tagRegistry.getInstance(options.type, model);
  }

  public async delete(options: DeleteOptions): Promise<boolean> {
    return this.tagRegistry.getStatic(options.type).delete(options.id);
  }

  public async listByType(options: ListByTypeOptions): Promise<Tag<TagModel>[]> {
    const cls = this.tagRegistry.getStatic(options.type);
    const models = await cls.findAll();
    return models.map((model) => this.tagRegistry.getInstance(options.type, model));
  }

  public async listAll(): Promise<Tag<TagModel>[]> {
    const results = await Promise.all([
      this.listByType({ type: TAG_TYPE.TAG_TOPIC }),
      this.listByType({ type: TAG_TYPE.TAG_DIFFICULTY }),
      this.listByType({ type: TAG_TYPE.TAG_SUBJECT })
    ]);

    return [...results[0], ...results[1], ...results[2]];
  }
}
