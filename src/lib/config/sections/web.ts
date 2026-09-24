import type { Form } from '$lib/form';
import { ConfigSection } from '../section.svelte';

const webOptions = {
  fields: {
    host: {
      label: 'Host',
      description: 'Hostname or IP address the web server binds to.',
      type: 'text'
    },
    port: {
      label: 'Port',
      description: 'TCP port the web server listens on.',
      type: 'number',
      isInteger: true,
      min: 1,
      max: 65535
    }
  }
} as const satisfies Form;

export class WebConfigSection extends ConfigSection<typeof webOptions> {
  static id = 'web';

  get optionsForm() {
    return webOptions;
  }
}
