import type { TagColor, TagType } from '$lib/zenstack/models';
import type { TagModel } from './tagModel';

export abstract class Tag<T extends TagModel> {
  constructor(public readonly model: T) {}

  get id(): string {
    return this.model.id;
  }

  get type(): TagType {
    return this.model.type;
  }

  get color(): TagColor {
    return this.model.color;
  }

  get label(): string {
    return this.model.label;
  }

  get order(): number {
    return this.model.order;
  }
}
