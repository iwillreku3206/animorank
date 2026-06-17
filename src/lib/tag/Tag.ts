import type { TagType, Tag as TagModel } from '$lib/zenstack/models';

export abstract class Tag<T extends TagModel> {
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly model: T) {}

  get id(): string {
    return this.model.id;
  }

  get type(): TagType {
    return this.model.type;
  }

  get label(): string {
    return this.model.label;
  }

  get order(): number {
    return this.model.order;
  }
}
