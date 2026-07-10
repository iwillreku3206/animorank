<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TagSelect from './TagSelect.svelte';
  import { TagType } from '$lib/zenstack/models';

  const sampleTags = [
    { id: '1', label: 'Math', type: TagType.SubjectTag, order: 1 },
    { id: '2', label: 'Basic', type: TagType.DifficultyTag, order: 1 },
    { id: '3', label: 'Intermediate', type: TagType.DifficultyTag, order: 2 },
    { id: '4', label: 'Advanced', type: TagType.DifficultyTag, order: 3 },
    { id: '5', label: 'Algebra', type: TagType.TopicTag, order: 0 },
    { id: '6', label: 'Geometry', type: TagType.TopicTag, order: 0 }
  ];

  const { Story } = defineMeta({
    title: 'UI/TagSelect',
    component: TagSelect,
    tags: ['autodocs'],
    argTypes: {
      selectedTagId: { control: 'text' },
      placeholder: { control: 'text' }
    },
    args: {
      tags: sampleTags,
      placeholder: 'Select a tag…'
    }
  });
</script>

<Story name="Default" />

<Story
  name="WithSelected"
  args={{ selectedTagId: '1' }}
/>

<Story
  name="CustomPlaceholder"
  args={{ placeholder: 'Pick a difficulty…' }}
/>
