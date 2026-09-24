import type { TagType, Tag as TagModel } from '$lib/zenstack/models';
import { ServerRegistryProvider } from '$lib/registry/server';
import { TagRegistry } from './tagRegistry';
import type { Tag } from './Tag';
import type { TagUpdateOptions } from './tagRegistry';
import { db } from '$lib/zenstack';

export interface FindByIdOptions {
  id: string;
  type: TagType;
}

export interface CreateOptions {
  type: TagType;
  label: string;
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
  public async create(options: CreateOptions): Promise<Tag<TagModel> | null> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    const cls = await tagRegistry.getStatic(options.type);
    const model = await cls.create(options);
    return tagRegistry.getInstance(options.type, model);
  }

  public async findById(options: FindByIdOptions): Promise<Tag<TagModel> | null> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    const cls = await tagRegistry.getStatic(options.type);
    const model = await cls.findById(options.id);
    if (!model) return null;

    return tagRegistry.getInstance(options.type, model);
  }

  public async update(options: UpdateOptions): Promise<Tag<TagModel> | null> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    const cls = await tagRegistry.getStatic(options.type);
    const model = await cls.update(options.id, options as TagUpdateOptions);
    if (!model) return null;

    return tagRegistry.getInstance(options.type, model);
  }

  public async delete(options: DeleteOptions): Promise<boolean> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    return (await tagRegistry.getStatic(options.type)).delete(options.id);
  }

  public async findByType(options: ListByTypeOptions): Promise<Tag<TagModel>[]> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    const cls = await tagRegistry.getStatic(options.type);
    const models = await cls.findAll();
    return Promise.all(models.map((model) => tagRegistry.getInstance(options.type, model)));
  }

  public async findAll(): Promise<Tag<TagModel>[]> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    const tags = await db.tag.findMany({ orderBy: [{ order: 'asc' }, { label: 'asc' }] });
    return Promise.all(
      tags.map((tag) => {
        return tagRegistry.getInstance(tag.type, tag);
      })
    );
  }

  public async findByIds(ids: string[]): Promise<Tag<TagModel>[]> {
    const tagRegistry = ServerRegistryProvider.instance().getRegistry(TagRegistry);
    const tags = await db.tag.findMany({
      where: { id: { in: ids } }
    });
    return Promise.all(
      tags.map((tag) => {
        return tagRegistry.getInstance(tag.type, tag);
      })
    );
  }
}
