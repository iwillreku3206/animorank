<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Select from './Select.svelte';

  const { Story } = defineMeta({
    title: 'UI/Select',
    component: Select,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' },
      disabled: { control: 'boolean' }
    }
  });
</script>

{#snippet options()}
  <option value={null}>None</option>
  <option value="basic">Basic</option>
  <option value="intermediate">Intermediate</option>
  <option value="advanced">Advanced</option>
{/snippet}

<Story name="Default">{@render options()}</Story>

<!-- The three variants in use today, so the migrated call sites can be checked
     against a reference: select-bordered (5), select-primary (4), select-xs (7). -->
<Story
  name="Bordered"
  args={{ class: 'select-bordered' }}>{@render options()}</Story
>

<Story
  name="Primary"
  args={{ class: 'select-primary' }}>{@render options()}</Story
>

<Story
  name="ExtraSmall"
  args={{ class: 'select-xs' }}>{@render options()}</Story
>

<Story
  name="Small"
  args={{ class: 'select-sm' }}>{@render options()}</Story
>

<Story
  name="Ghost"
  args={{ class: 'select-ghost' }}>{@render options()}</Story
>

<Story
  name="Success"
  args={{ class: 'select-success' }}>{@render options()}</Story
>

<Story
  name="Warning"
  args={{ class: 'select-warning' }}>{@render options()}</Story
>

<Story
  name="Error"
  args={{ class: 'select-error' }}>{@render options()}</Story
>

<Story
  name="Disabled"
  args={{ disabled: true }}>{@render options()}</Story
>

<Story
  name="FullWidth"
  args={{ class: 'select-bordered w-full' }}>{@render options()}</Story
>
