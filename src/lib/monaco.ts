import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { registerMonacoThemes } from '$lib/components/editor/themes';

// Register AnimoRank's custom editor themes once, as soon as Monaco loads, so
// they are available by name to every editor instance created from this namespace.
registerMonacoThemes(monaco);

export { monaco };
