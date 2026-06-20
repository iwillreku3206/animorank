import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { registerAnimorankMonacoTheme } from '$lib/components/editor/animorankMonacoTheme';

// Register AnimoRank's custom editor theme once, as soon as Monaco loads, so it
// is available by name to every editor instance created from this namespace.
registerAnimorankMonacoTheme(monaco);

export { monaco };
