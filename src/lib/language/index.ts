import type { Editor } from '$lib/editor';
import type { ClassServiceOf } from '$lib/services/registry';
import type { LanguageRegistry } from './languageRegistry';

export abstract class Language<
  // Allowed because editors are consumed through the registry as the widest type;
  // concrete editors narrow their component props at the component boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  LanguageEditor extends Editor<any, any> = Editor<any, any>
> {
  public get id(): string {
    return (this.constructor as ClassServiceOf<LanguageRegistry>).id;
  }

  public abstract getEditor(): new () => LanguageEditor;
}
