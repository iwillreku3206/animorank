<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Toggle from './Toggle.svelte';

  const { Story } = defineMeta({
    title: 'UI/Toggle',
    component: Toggle,
    tags: ['autodocs'],
    argTypes: {
      class: { control: 'text' },
      labelClass: { control: 'text' },
      checked: { control: 'boolean' },
      disabled: { control: 'boolean' }
    }
  });
</script>

<!-- ── Bare control ─────────────────────────────────────────────────
     No children. This is the shape the editor settings rows use: the name sits
     in its own column, so the toggle carries an aria-label instead. -->

<Story
  name="Bare"
  args={{ 'aria-label': 'Word wrap' }}
/>

<!-- The exact classes the five editor-settings toggles use today. -->
<Story
  name="BareSettingsRow"
  args={{ class: 'toggle-primary toggle-sm', checked: true, 'aria-label': 'Minimap' }}
/>

<Story
  name="BareDisabled"
  args={{ disabled: true, checked: true, 'aria-label': 'Locked setting' }}
/>

<!-- ── Labelled ─────────────────────────────────────────────────────
     Children present: wrapped in the shared label row, matching Checkbox. -->

<Story name="Labelled">Word wrap</Story>

<Story
  name="LabelledChecked"
  args={{ class: 'toggle-primary toggle-sm', checked: true }}>Show minimap</Story
>

<Story
  name="LabelledDisabled"
  args={{ disabled: true }}>Cannot change this</Story
>

<!-- ── Colour and size reference ────────────────────────────────── -->

<Story
  name="Primary"
  args={{ class: 'toggle-primary', checked: true }}
/>

<Story
  name="Secondary"
  args={{ class: 'toggle-secondary', checked: true }}
/>

<Story
  name="Success"
  args={{ class: 'toggle-success', checked: true }}
/>

<Story
  name="Warning"
  args={{ class: 'toggle-warning', checked: true }}
/>

<Story
  name="Error"
  args={{ class: 'toggle-error', checked: true }}
/>

<Story
  name="Small"
  args={{ class: 'toggle-sm', checked: true }}
/>

<Story
  name="ExtraSmall"
  args={{ class: 'toggle-xs', checked: true }}
/>

<Story
  name="Large"
  args={{ class: 'toggle-lg', checked: true }}
/>
