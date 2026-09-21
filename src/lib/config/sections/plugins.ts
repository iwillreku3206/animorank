import type { Form } from '$lib/form';
import { ConfigSection } from '../section.svelte';

const pluginsOptions = {
  fields: {
    pluginDir: {
      label: 'Plugin Directory',
      description: 'Directory that contains the plugin packages.',
      type: 'text'
    }
  }
} as const satisfies Form;

export class PluginsConfigSection extends ConfigSection<typeof pluginsOptions> {
  static id = 'plugins';

  get optionsForm() {
    return pluginsOptions;
  }
}
