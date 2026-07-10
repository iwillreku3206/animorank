<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ClickableBadge from './ClickableBadge.svelte';

  const { Story } = defineMeta({
    title: 'UI/ClickableBadge',
    component: ClickableBadge,
    tags: ['autodocs'],
    argTypes: {
      href: { control: 'text' },
      class: { control: 'text' }
    }
  });
</script>

<Story
  name="AsButton"
  args={{ class: 'badge-primary' }}>Click me</Story
>

<Story
  name="AsLink"
  args={{ href: '#', class: 'badge-neutral' }}>Visit page</Story
>
