<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TagChip from './TagChip.svelte';
  import { TagType } from '$lib/zenstack/models';

  const { Story } = defineMeta({
    title: 'UI/TagChip',
    component: TagChip,
    tags: ['autodocs'],
    argTypes: {
      tag: { control: 'object' },
      href: { control: 'text' }
    }
  });
</script>

<Story
  name="Subject"
  args={{
    tag: { label: 'Math', type: TagType.SubjectTag, order: 1 }
  }}
/>

<Story
  name="DifficultyBasic"
  args={{
    tag: { label: 'Basic', type: TagType.DifficultyTag, order: 1 }
  }}
/>

<Story
  name="DifficultyIntermediate"
  args={{
    tag: { label: 'Intermediate', type: TagType.DifficultyTag, order: 2 }
  }}
/>

<Story
  name="DifficultyAdvanced"
  args={{
    tag: { label: 'Advanced', type: TagType.DifficultyTag, order: 3 }
  }}
/>

<Story
  name="Topic"
  args={{
    tag: { label: 'Algebra', type: TagType.TopicTag, order: 0 }
  }}
/>

<Story
  name="AsLink"
  args={{
    tag: { label: 'Geometry', type: TagType.TopicTag, order: 0 },
    href: '#'
  }}
/>
