<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Alert from './Alert.svelte';
  import CircleInfoIcon from '@iconify-svelte/fa6-solid/circle-info';
  import CircleCheckIcon from '@iconify-svelte/fa6-solid/circle-check';
  import TriangleExclamationIcon from '@iconify-svelte/fa6-solid/triangle-exclamation';
  import CircleXmarkIcon from '@iconify-svelte/fa6-solid/circle-xmark';

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
  <CircleInfoIcon class="h-6 w-6 shrink-0" />
  New software update available.
</Story>

<Story
  name="Success"
  args={{ class: 'alert-success' }}
>
  <CircleCheckIcon class="h-6 w-6 shrink-0" />
  Your changes have been saved.
</Story>

<Story
  name="Warning"
  args={{ class: 'alert-warning' }}
>
  <TriangleExclamationIcon class="h-6 w-6 shrink-0" />
  Your session is about to expire.
</Story>

<Story
  name="Error"
  args={{ class: 'alert-error' }}
>
  <CircleXmarkIcon class="h-6 w-6 shrink-0" />
  Something went wrong. Please try again.
</Story>
