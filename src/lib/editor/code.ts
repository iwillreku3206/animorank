import { z } from 'zod';
import { Editor, type EditorComponent } from '.';
import CodeEditorComponent from './code.svelte';
import type { JsonValue } from '@zenstackhq/orm';
import { toJsonValue, type IntoJsonValue } from '$lib/types/utils';

const codeEditorStateValidator = z.object({
  sections: z.record(z.string(), z.string())
});

export class CodeEditorState {
  sections: Record<string, string>;

  public constructor(serialized: IntoJsonValue) {
    const {
      success: stateDecodeSuccess,
      data: state,
      error: stateDecodeError
    } = codeEditorStateValidator.safeParse(toJsonValue(serialized));

    if (!stateDecodeSuccess) {
      throw stateDecodeError;
    }

    this.sections = state.sections;
  }

  public toJSON(): JsonValue {
    return {
      sections: this.sections
    };
  }
}

export type CodeEditorOptions = {
  template: string;
  useSections: boolean;
};

export class CodeEditor extends Editor<CodeEditorOptions, CodeEditorState> {
  public get component(): EditorComponent<CodeEditorOptions, CodeEditorState> {
    return CodeEditorComponent;
  }

  constructor() {
    super();
  }
}
