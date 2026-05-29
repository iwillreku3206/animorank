import { db } from '$lib/zenstack';
import { TagColor } from '$lib/zenstack/models';
import type { SubjectTag as SubjectTagModel } from '$lib/zenstack/models';
import { Tag } from './Tag';

export interface SubjectTagCreateOptions {
  label: string;
  color?: TagColor;
  order?: number;
}

export interface SubjectTagUpdateOptions {
  data: Partial<SubjectTagModel>;
}

export class SubjectTag extends Tag<SubjectTagModel> {
  static async create(options: SubjectTagCreateOptions): Promise<SubjectTagModel> {
    const tag = await db.subjectTag.create({
      data: {
        label: options.label,
        color: options.color ?? TagColor.TAG_COLOR_DEFAULT,
        order: options.order ?? 0
      }
    });
    return tag;
  }

  static async findById(id: string): Promise<SubjectTagModel | null> {
    return db.subjectTag.findUnique({ where: { id } });
  }

  static async update(
    id: string,
    options: SubjectTagUpdateOptions
  ): Promise<SubjectTagModel | null> {
    const existing = await db.subjectTag.findUnique({ where: { id } });
    if (!existing) return null;

    return db.subjectTag.update({
      where: { id },
      data: options.data
    });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await db.subjectTag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async findAll(): Promise<SubjectTagModel[]> {
    return db.subjectTag.findMany({
      orderBy: [{ order: 'asc' }, { label: 'asc' }]
    });
  }
}
