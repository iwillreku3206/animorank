import { ServiceRegistry } from '$lib/registry';
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
  public id = 'config.section';

  constructor() {
    super();
    super.register(WebConfigSection.id, WebConfigSection);
    super.register(PluginsConfigSection.id, PluginsConfigSection);
  }
}
