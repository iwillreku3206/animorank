<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Accordion from './Accordion.svelte';

  const { Story } = defineMeta({
    title: 'UI/Accordion',
    component: Accordion,
    tags: ['autodocs'],
    argTypes: {
      icon: {
        control: { type: 'select' },
        options: ['arrow', 'plus', 'none']
      },
      open: { control: 'boolean' }
    }
  });
</script>

<Story
  name="Default"
  args={{ titleText: 'Section title' }}
>
  <p>This is the collapsible content inside the accordion panel.</p>
</Story>

<Story
  name="OpenByDefault"
  args={{ titleText: 'Already expanded', open: true }}
>
  <p>This panel starts open.</p>
</Story>

<Story
  name="PlusIcon"
  args={{ titleText: 'Plus icon', icon: 'plus' }}
>
  <p>Uses a plus/minus indicator instead of an arrow.</p>
</Story>

<Story
  name="NoIcon"
  args={{ titleText: 'No icon', icon: 'none' }}
>
  <p>No expand indicator at all.</p>
</Story>

<!-- Radio group: share the same `name` for exclusive open behavior -->
<Story
  name="RadioGroup"
  args={{ name: 'demo-group', titleText: 'Panel A', open: true }}
>
  <p>Content for the first panel in a radio group.</p>
</Story>
