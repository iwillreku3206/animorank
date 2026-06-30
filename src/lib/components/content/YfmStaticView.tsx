import React from 'react';

import { YfmStaticView } from '@gravity-ui/markdown-editor';
import { useEffect, useState } from 'react';
import transform from '@diplodoc/transform';
import { transform as latex } from '@diplodoc/latex-extension/plugin';
import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
import { transform as transformHTML } from '@diplodoc/html-extension';
import defaultPlugins from '@diplodoc/transform/lib/plugins';
import { LatexRuntime } from '@diplodoc/latex-extension/react';

export interface Props {
  initialText: string;
  // eslint-disable-next-line no-unused-vars
  setTextCallback: (callback: (text: string) => void) => void;
}

export default function YfmStaticViewWrapper(props: Props) {
  const [text, setText] = useState(props.initialText);
  const [html, setHtml] = useState('');

  useEffect(() => {
    props.setTextCallback((text) => setText(text));
  }, []);

  useEffect(() => {
    const { html } = transform(text, {
      allowHTML: true,
      plugins: [
        latex({
          bundle: false,
          runtime: 'extension:latex'
        }),

        mermaid({
          bundle: false,
          runtime: 'extension:mermaid'
        }),

        transformHTML({
          bundle: false,
          runtimeJsPath: 'extension:html'
        }),
        ...defaultPlugins
      ]
    }).result;

    setHtml(html);
  }, [text]);

  return (
    <>
      <YfmStaticView html={html} />
      <LatexRuntime />
    </>
  );
}
