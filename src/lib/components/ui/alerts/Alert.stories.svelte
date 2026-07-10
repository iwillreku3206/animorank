<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Alert from './Alert.svelte';

  const { Story } = defineMeta({
    title: 'UI/Alert',
    component: Alert,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' }
    }
  });
</script>

<Story name="Default">This is a default alert message.</Story>

<Story
  name="Info"
  args={{ class: 'alert-info' }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="h-6 w-6 shrink-0 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
  New software update available.
</Story>

<Story
  name="Success"
  args={{ class: 'alert-success' }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-6 w-6 shrink-0 stroke-current"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
  Your changes have been saved.
</Story>

<Story
  name="Warning"
  args={{ class: 'alert-warning' }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-6 w-6 shrink-0 stroke-current"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
  Your session is about to expire.
</Story>

<Story
  name="Error"
  args={{ class: 'alert-error' }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-6 w-6 shrink-0 stroke-current"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
  Something went wrong. Please try again.
</Story>
