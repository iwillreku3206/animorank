import { db } from '$lib/zenstack';
import type { DifficultyTag as DifficultyTagModel } from '$lib/zenstack/models';
import { Tag } from './Tag';

export interface DifficultyTagCreateOptions {
  label: string;
  order?: number;
}

export interface DifficultyTagUpdateOptions {
  data: Partial<DifficultyTagModel>;
}

export class DifficultyTag extends Tag<DifficultyTagModel> {
  static async create(options: DifficultyTagCreateOptions): Promise<DifficultyTagModel> {
    const tag = await db.difficultyTag.create({
      data: {
        label: options.label,
        order: options.order ?? 0
      }
    });
    return tag;
  }

  static async findById(id: string): Promise<DifficultyTagModel | null> {
    return db.difficultyTag.findUnique({ where: { id } });
  }

  static async update(
    id: string,
    options: DifficultyTagUpdateOptions
  ): Promise<DifficultyTagModel | null> {
    const existing = await db.difficultyTag.findUnique({ where: { id } });
    if (!existing) return null;

    return db.difficultyTag.update({
      where: { id },
      data: options.data
    });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await db.difficultyTag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async findAll(): Promise<DifficultyTagModel[]> {
    return db.difficultyTag.findMany({
      orderBy: [{ order: 'asc' }, { label: 'asc' }]
    });
  }
}
