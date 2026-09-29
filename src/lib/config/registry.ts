import { ServiceRegistry } from '$lib/registry';
import type { JsonValue } from '@zenstackhq/orm';
import { AppConfig } from './config';
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

/**
 * Serves the app's config: the config file behind it is read on first access,
 * so it is read once per process and every lookup after that gets the same
 * instance. Consumers reach it through the provider that serves them —
 * `getService(AppConfig)` — instead of a config path of their own.
 */
export class AppConfigRegistry extends ServiceRegistry<AppConfig, [], object> {
  public id = 'config';

  /** @param sections the section registry the config file's sections are hydrated through */
  constructor(sections: ConfigSectionRegistry) {
    super();
    this.registerSingletonLazy('default', () => AppConfig.loadConfig(sections));
  }
}
