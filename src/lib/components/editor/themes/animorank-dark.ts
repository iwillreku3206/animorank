import type { monaco } from '$lib/monaco';

/** AnimoRank's default dark editor theme. Fully static — edit colors directly here. */
export const animorankDark: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '7c7c7c', fontStyle: 'italic' },
    { token: 'keyword', foreground: '77de3d' },
    { token: 'keyword.control', foreground: '77de3d' },
    { token: 'string', foreground: '4dba89' },
    { token: 'number', foreground: 'e0a838' },
    { token: 'constant', foreground: 'e0a838' },
    { token: 'type', foreground: '83c9aa' },
    { token: 'type.identifier', foreground: '83c9aa' },
    { token: 'function', foreground: 'a9e289' },
    { token: 'variable', foreground: 'e6e6e6' },
    { token: 'operator', foreground: 'b6b6b6' },
    { token: 'delimiter', foreground: 'b6b6b6' }
  ],
  colors: {
    'editor.background': '#262626',
    'editor.foreground': '#e6e6e6',
    'editorLineNumber.foreground': '#737373',
    'editorLineNumber.activeForeground': '#e6e6e6',
    'editorCursor.foreground': '#77de3d',
    'editor.selectionBackground': '#77de3d40',
    'editor.inactiveSelectionBackground': '#77de3d20',
    'editor.lineHighlightBackground': '#e6e6e60d',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#e6e6e612',
    'editorIndentGuide.activeBackground1': '#77de3d55',
    'editorWhitespace.foreground': '#e6e6e614',
    'editorBracketMatch.background': '#77de3d22',
    'editorBracketMatch.border': '#77de3d',
    'editorGutter.background': '#262626',
    'editorWidget.background': '#1a1a1a',
    'editorWidget.border': '#0a0a0a',
    'editorSuggestWidget.background': '#1a1a1a',
    'editorSuggestWidget.selectedBackground': '#77de3d22',
    'editorHoverWidget.background': '#1a1a1a',
    'scrollbarSlider.background': '#e6e6e620',
    'scrollbarSlider.hoverBackground': '#e6e6e630',
    'scrollbarSlider.activeBackground': '#77de3d55',
    'editorError.foreground': '#e0584f',
    focusBorder: '#77de3d'
  }
};
