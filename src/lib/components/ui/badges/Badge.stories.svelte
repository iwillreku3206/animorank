<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Badge from './Badge.svelte';

  const { Story } = defineMeta({
    title: 'UI/Badge',
    component: Badge,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' }
    }
  });
</script>

<Story name="Default">Tag</Story>

<Story
  name="Primary"
  args={{ class: 'badge-primary' }}>Primary</Story
>

<Story
  name="Neutral"
  args={{ class: 'badge-neutral' }}>Neutral</Story
>

<Story
  name="Success"
  args={{ class: 'badge-success' }}>Success</Story
>

<Story
  name="Warning"
  args={{ class: 'badge-warning' }}>Warning</Story
>

<Story
  name="Error"
  args={{ class: 'badge-error' }}>Error</Story
>

<Story
  name="Outline"
  args={{ class: 'badge-outline' }}>Outline</Story
>
