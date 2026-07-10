<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' },
      href: { control: 'text' },
      disabled: { control: 'boolean' }
    }
  });
</script>

<Story name="Default">Click me</Story>

<Story
  name="Primary"
  args={{ class: 'btn-primary' }}>Primary</Story
>

<Story
  name="Neutral"
  args={{ class: 'btn-neutral' }}>Neutral</Story
>

<Story
  name="Success"
  args={{ class: 'btn-success' }}>Success</Story
>

<Story
  name="Warning"
  args={{ class: 'btn-warning' }}>Warning</Story
>

<Story
  name="Error"
  args={{ class: 'btn-error' }}>Error</Story
>

<Story
  name="Outline"
  args={{ class: 'btn-outline' }}>Outline</Story
>

<Story
  name="Disabled"
  args={{ disabled: true }}>Disabled</Story
>

<Story
  name="AsLink"
  args={{ href: '#' }}>Go somewhere</Story
>
