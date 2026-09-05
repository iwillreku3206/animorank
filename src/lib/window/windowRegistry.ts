import { Window } from './index';
import { ServiceRegistry } from '$lib/services/registry';

/**
 * Base class for window registries: a `ServiceRegistry` keyed by panel id,
 * whose windows are constructed with the editor context and expose their
 * title/closable settings as statics. Subclasses register their windows in
 * their constructor.
 */
export class WindowRegistry<T> extends ServiceRegistry<
  Window<T>,
  [context: T],
  { title: string; closeable: boolean }
> {}
