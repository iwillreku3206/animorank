<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CodeEditor from './code.svelte';
  import { CodeEditorState } from './code';

  const { Story } = defineMeta({
    title: 'Editor/CodeEditor',
    component: CodeEditor,
    tags: ['autodocs']
  });

  const bodyState = $state(new CodeEditorState({ sections: { body: 'int main() { return 0; }' } }));
  const sectionsState = $state(new CodeEditorState({ sections: {} }));
</script>

<Story
  name="Body"
  args={{
    state: bodyState,
    options: { template: '', useSections: false }
  }}
/>

<Story
  name="Sections"
  args={{
    state: sectionsState,
    options: {
      template: '#include <stdio.h>\n%slot body%\n%endslot body%\n',
      useSections: true
    }
  }}
/>
