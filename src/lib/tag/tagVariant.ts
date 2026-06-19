import { TagType, type Tag } from '$lib/zenstack/models';

/**
 * Hardcoded color system for tags.
 */
export type TagVariant = 'primary' | 'neutral' | 'success' | 'warning' | 'error';

/** daisyUI badge color modifier for each variant. */
const VARIANT_BADGE_CLASS: Record<TagVariant, string> = {
  primary: 'badge-primary',
  neutral: 'badge-neutral',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error'
};

/**
 * Difficulty tags are colored by their `order` (basic / intermediate / advanced).
 * See the seed data in scripts/addDefaultTags.ts.
 */
const DIFFICULTY_VARIANT_BY_ORDER: Record<number, TagVariant> = {
  1: 'success', // Basic
  2: 'warning', // Intermediate
  3: 'error' // Advanced
};

/** Fallback for any difficulty whose order isn't one of the known tiers. */
const DIFFICULTY_FALLBACK_VARIANT: TagVariant = 'neutral';

type TagLike = Pick<Tag, 'type' | 'order'>;

/** The semantic color variant for a tag. */
export function tagVariant(tag: TagLike): TagVariant {
  switch (tag.type) {
    case TagType.SubjectTag:
      return 'primary';
    case TagType.DifficultyTag:
      return DIFFICULTY_VARIANT_BY_ORDER[tag.order] ?? DIFFICULTY_FALLBACK_VARIANT;
    case TagType.TopicTag:
    default:
      return 'neutral';
  }
}

/** The daisyUI badge class for a tag's variant. */
export function tagVariantBadgeClass(tag: TagLike): string {
  return VARIANT_BADGE_CLASS[tagVariant(tag)];
}

export { VARIANT_BADGE_CLASS };
