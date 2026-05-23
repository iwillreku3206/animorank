import {
  useMarkdownEditor,
  MarkdownEditorView,
  wysiwygToolbarConfigs
} from '@gravity-ui/markdown-editor';
import { Toaster, ToasterProvider, ThemeProvider } from '@gravity-ui/uikit';
import { LatexExtension } from '@gravity-ui/markdown-editor-latex-extension';
import {
  wLatexBlockItemData,
  wLatexInlineItemData
} from '@gravity-ui/markdown-editor-latex-extension/configs';
import { Mermaid } from '@gravity-ui/markdown-editor/extensions/additional/Mermaid/index.js';
import { YfmHtmlBlock } from '@gravity-ui/markdown-editor/extensions/additional/YfmHtmlBlock/index.js';
import React from 'react';
import { useYfmHtmlBlockStyles } from './useYfmHtmlBlockStyles';
import { htmlBlockDefaultSanitizer } from '@diplodoc/html-extension';

const toaster = new Toaster();

const wCommandMenuConfig = wysiwygToolbarConfigs.wCommandMenuConfig.concat(
  wLatexBlockItemData,
  wLatexInlineItemData,
  wysiwygToolbarConfigs.wMermaidItemData,
  wysiwygToolbarConfigs.wYfmHtmlBlockItemData
);

export default function Editor({
  onChange,
  initialText
}: {
  onChange: (_text: string) => void;
  initialText: string;
}) {
  const editor = useMarkdownEditor({
    preset: 'full',
    initial: {
      markup: initialText
    },
    wysiwygConfig: {
      extensions: (builder) => {
        builder
          .use(LatexExtension, {
            loadRuntimeScript: () => {
              import('@diplodoc/latex-extension/runtime');
              import(
                // @ts-expect-error // no types for styles
                '@diplodoc/latex-extension/runtime/styles'
              );
            }
          })
          .use(Mermaid, {
            loadRuntimeScript: () => {
              import('@diplodoc/mermaid-extension/runtime');
            },
            autoSave: {
              enabled: true,
              delay: 1000
            }
          })
          .use(YfmHtmlBlock, {
            useConfig: useYfmHtmlBlockStyles,
            sanitize: htmlBlockDefaultSanitizer,
            autoSave: {
              enabled: true,
              delay: 1000
            },
            head: `
                        <base target="_blank" />
                        <style>
                            html, body {
                                margin: 0;
                                padding: 0;
                            }
                        </style
                    `
          });
      },
      extensionOptions: { commandMenu: { actions: wCommandMenuConfig } }
    }
  });

  React.useEffect(() => {
    function changeHandler() {
      // Serialize current content to markdown markup
      const value = editor.getValue();
      onChange(value);
    }

    editor.on('change', changeHandler);
    return () => {
      editor.off('change', changeHandler);
    };
  }, [onChange]);

  return (
    <ThemeProvider>
      <ToasterProvider toaster={toaster}>
        <MarkdownEditorView
          stickyToolbar
          autofocus
          editor={editor}
        />
      </ToasterProvider>
    </ThemeProvider>
  );
}
