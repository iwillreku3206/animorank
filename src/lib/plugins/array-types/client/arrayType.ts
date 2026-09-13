import type { ValueDisplay, ValueEditor } from '$lib/testCase/builtin/functionTestCase/types';
import { ArrayType } from '../arrayTypes';
import ArrayDisplay from './ArrayDisplay.svelte';
import ArrayEditor from './ArrayEditor.svelte';

// The type's components belong to the client build; install them so instances
// created anywhere in the browser can render their value.
ArrayType.installComponents({
  valueForm: ArrayEditor as unknown as ValueEditor,
  valueDisplay: ArrayDisplay as unknown as ValueDisplay
});

export { ArrayType };
