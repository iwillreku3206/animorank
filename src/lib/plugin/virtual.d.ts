/** The prebuilt plugin entries the app's build resolved; see `scripts/prebuiltPluginEntries.ts`. */
declare module 'virtual:prebuilt-plugin-entries' {
  import type { PrebuiltClientEntries } from '$lib/plugin/prebuiltClientEntries';

  export const prebuiltPluginEntries: Record<string, PrebuiltClientEntries>;
}
