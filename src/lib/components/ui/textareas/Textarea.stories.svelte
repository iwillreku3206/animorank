<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Textarea from './Textarea.svelte';

  const { Story } = defineMeta({
    title: 'UI/Textarea',
    component: Textarea,
    tags: ['autodocs'],
    argTypes: {
      value: { control: 'text' },
      placeholder: { control: 'text' },
      rows: { control: 'number' },
      disabled: { control: 'boolean' }
    }
  });
</script>

<Story
  name="Default"
  args={{ placeholder: 'Enter text…', class: 'w-full' }}
/>

<Story
  name="WithValue"
  args={{ value: 'Hello world', class: 'w-full' }}
/>

<!-- The shape both test-case editors use: monospaced, so columns of input line up. -->
<Story
  name="Monospace"
  args={{ placeholder: '1 2 3', class: 'textarea-primary w-full font-mono' }}
/>

<!-- `rows` under ~4 is floored by daisyUI's `min-height: 5rem`; a height class is
     what actually makes a field taller. -->
<Story
  name="Tall"
  args={{ placeholder: 'Longer input…', class: 'min-h-32 w-full' }}
/>

<Story
  name="Disabled"
  args={{ placeholder: 'Cannot edit', disabled: true, class: 'w-full' }}
/>
