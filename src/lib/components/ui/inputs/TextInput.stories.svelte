<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TextInput from './TextInput.svelte';

  const { Story } = defineMeta({
    title: 'UI/TextInput',
    component: TextInput,
    tags: ['autodocs'],
    argTypes: {
      value: { control: 'text' },
      placeholder: { control: 'text' },
      type: {
        control: { type: 'select' },
        options: ['text', 'email', 'password', 'number', 'search']
      },
      disabled: { control: 'boolean' }
    }
  });
</script>

<Story
  name="Default"
  args={{ placeholder: 'Enter text…' }}
/>

<Story
  name="WithValue"
  args={{ value: 'Hello world' }}
/>

<Story
  name="Email"
  args={{ type: 'email', placeholder: 'name@example.com' }}
/>

<Story
  name="Password"
  args={{ type: 'password', placeholder: 'Password' }}
/>

<Story
  name="Number"
  args={{ type: 'number', placeholder: '42' }}
/>

<Story
  name="Disabled"
  args={{ placeholder: 'Cannot edit', disabled: true }}
/>
