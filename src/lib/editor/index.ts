import type { IntoJsonValue } from '$lib/types/utils';
import type { Component } from 'svelte';

export type EditorComponent<Options extends IntoJsonValue, State extends IntoJsonValue> = Component<{
  options: Options;
  state: State;
}>;

export abstract class Editor<
  // Allowed because editors are consumed through the registry as the widest type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Options extends IntoJsonValue = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  State extends IntoJsonValue = any
> {
  public abstract get component(): EditorComponent<Options, State>;
}
