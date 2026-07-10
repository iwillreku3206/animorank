<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Link from './Link.svelte';

  const { Story } = defineMeta({
    title: 'UI/Link',
    component: Link,
    tags: ['autodocs'],
    argTypes: {
      href: { control: 'text' },
      class: { control: 'text' }
    },
    args: {
      href: '#'
    }
  });
</script>

<Story
  name="Default"
  args={{ href: '#' }}>Default link</Story
>

<Story
  name="Hover"
  args={{ href: '#', class: 'link-hover' }}>Hover underline</Story
>

<Story
  name="Neutral"
  args={{ href: '#', class: 'link-neutral' }}>Neutral muted</Story
>

<Story
  name="NeutralHover"
  args={{ href: '#', class: 'link-hover link-neutral' }}>Neutral + hover</Story
>

<Story
  name="External"
  args={{ href: 'https://example.com', target: '_blank', rel: 'external' }}>External link</Story
>
