import { db } from '$lib/zenstack';
import { TagColor, TagType as TAG_TYPE } from '$lib/zenstack/models';
import type { TopicTag as TopicTagModel } from '$lib/zenstack/models';
import { Tag } from './Tag';

export interface TopicTagCreateOptions {
  label: string;
  color?: TagColor;
  order?: number;
}

export interface TopicTagUpdateOptions {
  data: Partial<TopicTagModel>;
}

export class TopicTag extends Tag<TopicTagModel> {
  static async create(options: TopicTagCreateOptions): Promise<TopicTagModel> {
    const tag = await db.topicTag.create({
      data: {
        label: options.label,
        color: options.color ?? TagColor.TAG_COLOR_DEFAULT,
        order: options.order ?? 0
      }
    });
    return tag;
  }

  static async findById(id: string): Promise<TopicTagModel | null> {
    return db.topicTag.findUnique({ where: { id } });
  }

  static async update(id: string, options: TopicTagUpdateOptions): Promise<TopicTagModel | null> {
    const existing = await db.topicTag.findUnique({ where: { id } });
    if (!existing) return null;

    return db.topicTag.update({
      where: { id },
      data: options.data
    });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await db.topicTag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async findAll(): Promise<TopicTagModel[]> {
    return db.topicTag.findMany({
      orderBy: [{ order: 'asc' }, { label: 'asc' }]
    });
  }
}
