import type { IntoJsonValue } from '$lib/types/utils';
import type { Component } from 'svelte';

export type EditorComponent<Options extends IntoJsonValue, State extends IntoJsonValue> = Component<{
  options: Options;
  state: State;
}>;

export abstract class Editor<
  Options extends IntoJsonValue = IntoJsonValue,
  State extends IntoJsonValue = IntoJsonValue
> {
  public abstract get component(): EditorComponent<Options, State>;
}
