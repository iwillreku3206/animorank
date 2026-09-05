<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Checkbox from './Checkbox.svelte';

  const { Story } = defineMeta({
    title: 'UI/Checkbox',
    component: Checkbox,
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
     No children: renders just the input. Used where the checkbox is named by
     aria-label (the problems table) or wrapped in the caller's own label
     (the ToS cards, the delete-account confirm). -->

<Story name="Bare" />

<Story
  name="BareChecked"
  args={{ checked: true }}
/>

<Story
  name="BareDisabled"
  args={{ disabled: true, checked: true }}
/>

<!-- ── Labelled ─────────────────────────────────────────────────────
     Children present: wrapped in the shared label row, so the text is part of
     the click target. -->

<Story name="Labelled">Auto-accept submissions</Story>

<Story
  name="LabelledChecked"
  args={{ checked: true }}>Global (visible to all students)</Story
>

<!-- How the two filter panels use it: smaller control, smaller text. -->
<Story
  name="LabelledSmall"
  args={{ class: 'checkbox-sm checkbox-primary', labelClass: 'text-sm' }}>Match all selected tags</Story
>

<!-- How DynamicForm and the problem editor's "Enable slots" use it. -->
<Story
  name="LabelledExtraSmall"
  args={{ class: 'checkbox-xs checkbox-primary' }}>Enable slots</Story
>

<Story
  name="LabelledDisabled"
  args={{ disabled: true }}>Cannot change this</Story
>

<!-- daisyUI's `.label` sets `white-space: nowrap`, so long text runs on rather
     than wrapping. Kept as a reference for that constraint — add
     `labelClass="whitespace-normal items-start"` if a caller needs wrapping. -->
<Story
  name="LabelledLongText"
  args={{ class: 'checkbox-sm checkbox-primary', labelClass: 'max-w-xs text-sm' }}
  >Show only problem sets that match every one of the selected topic tags</Story
>

<!-- ── Colour and size reference ────────────────────────────────────
     checkbox-primary (5 call sites), checkbox-sm (2), checkbox-xs (2),
     checkbox-error (1); the rest are for tweaking against. -->

<Story
  name="Primary"
  args={{ class: 'checkbox-primary', checked: true }}
/>

<Story
  name="Error"
  args={{ class: 'checkbox-error', checked: true }}
/>

<Story
  name="Secondary"
  args={{ class: 'checkbox-secondary', checked: true }}
/>

<Story
  name="Success"
  args={{ class: 'checkbox-success', checked: true }}
/>

<Story
  name="Warning"
  args={{ class: 'checkbox-warning', checked: true }}
/>

<!-- The rounded override the problem editor's "Enable slots" checkbox uses. -->
<Story
  name="Rounded"
  args={{ class: 'checkbox-xs checkbox-primary rounded-xl!', checked: true }}
/>
