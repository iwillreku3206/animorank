import { CodeEditor } from '$lib/editor/code';
import { Language } from '.';

export class CLanguage extends Language<CodeEditor> {
  public static id = 'c';

  constructor() {
    super();
  }

  public getEditor(): new () => CodeEditor {
    return CodeEditor;
  }
}
