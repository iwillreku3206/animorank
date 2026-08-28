import { ServiceRegistry, type ClassServiceOf } from '$lib/registry';
import type { JsonValue } from '@zenstackhq/orm';
import type { ConfigSection } from './section.svelte';
import { WebConfigSection } from './sections/web';
import { PluginsConfigSection } from './sections/plugins';

export class ConfigSectionRegistry extends ServiceRegistry<
  // Asserted by class generic contract
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConfigSection<any>,
  [JsonValue | undefined],
  { id: string }
> {
  constructor() {
    super();
    this.registerSection(WebConfigSection);
    this.registerSection(PluginsConfigSection);
  }

  registerSection(section: ClassServiceOf<typeof this>) {
    this.register(section.id, section);
  }
}
