import { describe, expect, it } from 'vitest';
import type { Form } from '$lib/form';
import type { ConfigSection } from './section.svelte';
import { ConfigSectionRegistry } from './registry';

describe('ConfigSectionRegistry', () => {
  it('registers the built-in web and plugins sections', () => {
    const registry = new ConfigSectionRegistry();
    expect(registry.keys().sort()).toEqual(['plugins', 'web']);
  });

  it('hydrates section data from the config JSON', async () => {
    const registry = new ConfigSectionRegistry();
    const web = await registry.getInstance('web', { host: '0.0.0.0', port: 8080 });
    expect(web.data).toEqual({ host: '0.0.0.0', port: 8080 });
    const plugins = await registry.getInstance('plugins', { enable: true, pluginDir: '/tmp/plugins' });
    expect(plugins.data).toEqual({ enable: true, pluginDir: '/tmp/plugins' });
  });

  it('documents every config option with a description', async () => {
    const registry = new ConfigSectionRegistry();
    for (const key of registry.keys()) {
      const section = (await registry.getInstance(key, undefined)) as ConfigSection<Form>;
      const fields = section.optionsForm.fields;
      for (const [fieldKey, field] of Object.entries(fields)) {
        expect(field.description, `${key}.${fieldKey}`).toBeTruthy();
      }
    }
  });
});
