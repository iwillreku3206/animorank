<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ButtonLink from './ButtonLink.svelte';

  const { Story } = defineMeta({
    title: 'UI/ButtonLink',
    component: ButtonLink,
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

<Story name="Default">Go to page</Story>

<Story
  name="Primary"
  args={{ class: 'btn-primary' }}>Primary link</Story
>
