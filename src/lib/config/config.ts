import path from 'path';
import fs from 'fs/promises';
import type { ConfigSection } from './section.svelte';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { ConfigSectionRegistry } from './registry';
import type { JsonValue } from '@zenstackhq/orm';

type Sections = Record<string, ConfigSection>;

export class AppConfig {
  private path: string;

  private sections: Sections;

  // Public so the class can be used as a provider key; loadConfig is the
  // canonical way to build an instance.
  constructor(configPath: string, sections: Sections) {
    this.path = configPath ?? path.join(process.cwd(), 'config.json');
    this.sections = sections;
  }

  public static async loadConfig(path: string): Promise<AppConfig> {
    const reg = GlobalRegistryProvider.instance().getRegistry(ConfigSectionRegistry);
    const raw = (await fs.readFile(path)).toString();
    const parsed = JSON.parse(raw);
    const sections: Sections = {};
    for (const k of reg.keys()) {
      sections[k] = await reg.getInstance(k, parsed[k] as JsonValue);
    }
    const config = new AppConfig(path, sections);
    await config.save();
    GlobalRegistryProvider.instance().registerSingleton(AppConfig, config);
    return config;
  }

  public async save() {
    const json = JSON.stringify(this.sections, null, 2);
    return fs.writeFile(this.path, json);
  }
}
