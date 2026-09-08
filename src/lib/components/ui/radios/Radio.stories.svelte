<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Radio from './Radio.svelte';

  const { Story } = defineMeta({
    title: 'UI/Radio',
    component: Radio,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' },
      labelClass: { control: 'text' },
      disabled: { control: 'boolean' }
    }
  });
</script>

<script>
  // One piece of state per group story, so selecting actually moves the dot.
  let theme = $state('dark');
  let size = $state('md');
</script>

<!-- ── Groups ───────────────────────────────────────────────────────
     A lone radio can't show what a radio does, so the useful references are
     groups. `bind:group` on each option is the whole API. -->

<Story name="Group">
  {#snippet template()}
    <div class="flex flex-col gap-1">
      {#each ['light', 'dark', 'system'] as option (option)}
        <Radio
          name="theme"
          value={option}
          bind:group={theme}>{option}</Radio
        >
      {/each}
    </div>
  {/snippet}
</Story>

<!-- The classes DynamicForm's radio fields use today. -->
<Story name="GroupExtraSmall">
  {#snippet template()}
    <div class="flex flex-col gap-1">
      {#each ['sm', 'md', 'lg'] as option (option)}
        <Radio
          class="radio-xs radio-primary"
          name="size"
          value={option}
          bind:group={size}>{option}</Radio
        >
      {/each}
    </div>
  {/snippet}
</Story>

<!-- ── Single control states ────────────────────────────────────── -->

<Story
  name="Selected"
  args={{ value: 'a', group: 'a' }}>Selected option</Story
>

<Story
  name="Unselected"
  args={{ value: 'a', group: 'b' }}>Unselected option</Story
>

<Story
  name="Disabled"
  args={{ value: 'a', group: 'a', disabled: true }}>Cannot change this</Story
>

<!-- Bare, for a caller supplying its own label markup. -->
<Story
  name="Bare"
  args={{ value: 'a', group: 'a', 'aria-label': 'Option A' }}
/>

<!-- ── Colour and size reference ────────────────────────────────── -->

<Story
  name="Primary"
  args={{ value: 'a', group: 'a', class: 'radio-primary' }}
/>

<Story
  name="Secondary"
  args={{ value: 'a', group: 'a', class: 'radio-secondary' }}
/>

<Story
  name="Success"
  args={{ value: 'a', group: 'a', class: 'radio-success' }}
/>

<Story
  name="Error"
  args={{ value: 'a', group: 'a', class: 'radio-error' }}
/>

<Story
  name="ExtraSmall"
  args={{ value: 'a', group: 'a', class: 'radio-xs radio-primary' }}
/>

<Story
  name="Small"
  args={{ value: 'a', group: 'a', class: 'radio-sm radio-primary' }}
/>
