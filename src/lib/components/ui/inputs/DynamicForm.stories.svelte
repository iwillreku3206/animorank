<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DynamicForm from './DynamicForm.svelte';
  import type { Form, FormValue } from '$lib/form';

  import StarIcon from '@iconify-svelte/fa6-solid/star';
  import HeartIcon from '@iconify-svelte/fa6-solid/heart';
  import SunIcon from '@iconify-svelte/fa6-solid/sun';
  import MoonIcon from '@iconify-svelte/fa6-solid/moon';

  const fullForm: Form = {
    fields: {
      name: { label: 'Name', type: 'text' },
      email: { label: 'Email', type: 'text', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { label: 'Age', type: 'number', min: 0, max: 150, isInteger: true },
      bio: { label: 'Bio', type: 'text' },
      website: { label: 'Website', type: 'url' },
      level: {
        label: 'Level',
        type: 'select',
        options: ['Beginner', 'Intermediate', 'Advanced']
      },
      newsletter: { label: 'Subscribe to newsletter', type: 'checkbox' },
      theme: {
        label: 'Theme',
        type: 'radio',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'System', value: 'system' }
        ]
      },
      birthday: { label: 'Birthday', type: 'date' },
      alarm: { label: 'Alarm', type: 'time' },
      appointment: { label: 'Appointment', type: 'datetime' },
      volume: { label: 'Volume', type: 'range', min: 0, max: 100, isInteger: true },
      notes: { label: 'Notes', type: 'markdown', default: '# Notes\n\nWrite here...' },
      script: { label: 'Script', type: 'code', default: '#!/bin/bash\necho hello' }
    }
  };

  function emptyValue(): FormValue<typeof fullForm> {
    return {} as FormValue<typeof fullForm>;
  }

  function prefilledValue(): FormValue<typeof fullForm> {
    return {
      name: 'Alice',
      email: 'alice@example.com',
      age: 30,
      bio: '',
      website: 'https://example.com',
      level: 'Advanced',
      newsletter: true,
      theme: 'dark',
      birthday: '2000-01-01',
      alarm: '08:30',
      appointment: '2026-07-10T14:00',
      volume: 75,
      notes: '# Prefilled\n\nSome **markdown** content.',
      script: 'export default function App() {\n  return <div />;\n}'
    } as FormValue<typeof fullForm>;
  }

  const { Story } = defineMeta({
    title: 'UI/DynamicForm',
    component: DynamicForm,
    tags: ['autodocs']
  });

  const selectIconForm: Form = {
    fields: {
      favorite: {
        label: 'Favorite',
        type: 'select',
        options: [
          { label: 'Star', value: 'star', icon: StarIcon },
          { label: 'Heart', value: 'heart', icon: HeartIcon },
          { label: 'Sun', value: 'sun', icon: SunIcon },
          { label: 'Moon', value: 'moon', icon: MoonIcon }
        ]
      }
    }
  };

  const radioIconForm: Form = {
    fields: {
      theme: {
        label: 'Theme',
        type: 'radio',
        options: [
          { label: 'Light', value: 'light', icon: SunIcon },
          { label: 'Dark', value: 'dark', icon: MoonIcon },
          { label: 'Favorite', value: 'fave', icon: StarIcon }
        ]
      }
    }
  };

  const segmentedForm: Form = {
    fields: {
      priority: {
        label: 'Priority',
        type: 'segmented',
        options: ['Low', 'Medium', 'High']
      }
    }
  };

  const segmentedIconForm: Form = {
    fields: {
      view: {
        label: 'View',
        type: 'segmented',
        options: [
          { label: 'Light', value: 'light', icon: SunIcon },
          { label: 'Dark', value: 'dark', icon: MoonIcon },
          { label: 'Star', value: 'star', icon: StarIcon }
        ]
      }
    }
  };
</script>

<Story
  name="AllFieldTypes"
  args={{ form: fullForm, value: emptyValue() }}
/>

<Story
  name="Prefilled"
  args={{ form: fullForm, value: prefilledValue() }}
/>

<Story
  name="TextOnly"
  args={{
    form: {
      fields: {
        username: { label: 'Username', type: 'text' },
        bio: { label: 'Bio', type: 'text' }
      }
    },
    value: {}
  }}
/>

<Story
  name="WithDefaults"
  args={{
    form: {
      fields: {
        score: { label: 'Score', type: 'number', default: 50, min: 0, max: 100 },
        active: { label: 'Active', type: 'checkbox', default: true },
        comment: { label: 'Comment', type: 'text', default: 'Nice!' }
      }
    },
    value: {}
  }}
/>

<Story
  name="SelectWithIcons"
  args={{ form: selectIconForm, value: {} }}
/>

<Story
  name="RadioWithIcons"
  args={{ form: radioIconForm, value: {} }}
/>

<Story
  name="Segmented"
  args={{ form: segmentedForm, value: {} }}
/>

<Story
  name="SegmentedWithIcons"
  args={{ form: segmentedIconForm, value: {} }}
/>
