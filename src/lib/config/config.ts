import path from 'path';
import type * as FsPromises from 'fs/promises';
import type { ConfigSection, ConfigSectionClass } from './section.svelte';
import type { ConfigSectionRegistry } from './registry';
import type { JsonValue } from '@zenstackhq/orm';

/** Name of the app's config file, relative to the process root. */
export const CONFIG_FILE = 'config.json';

/** The config file `loadConfig` reads when no path is given. */
const DEFAULT_CONFIG_PATH = path.join(process.cwd(), CONFIG_FILE);

type Sections = Record<string, ConfigSection>;

export class AppConfig {
  private path: string;

  private sections: Sections;

  // Public so the class can be used as a provider key; `AppConfigRegistry`
  // (see `$lib/config/registry`) is the canonical way to build the instance
  // the app shares.
  constructor(configPath: string, sections: Sections) {
    this.path = configPath;
    this.sections = sections;
  }

  /**
   * The config the file at `configPath` describes: every section the section
   * registry knows is hydrated from its key in the file. A file that is not
   * there is not an error — every section stays unconfigured — and reading
   * never writes the file, so an app can run on the defaults alone.
   */
  public static async loadConfig(
    sections: ConfigSectionRegistry,
    configPath: string = DEFAULT_CONFIG_PATH
  ): Promise<AppConfig> {
    const parsed = await readConfigFile(configPath);
    const hydrated: Sections = {};
    for (const key of sections.keys()) {
      hydrated[key] = await sections.getInstance(key, parsed?.[key]);
    }
    return new AppConfig(configPath, hydrated);
  }

  public async save() {
    const { writeFile } = await configFileSystem();
    const json = JSON.stringify(this.sections, null, 2);
    return writeFile(this.path, json);
  }

  /**
   * The instance of one config section, hydrated from the config JSON. Pass
   * the section class itself, e.g. `getSection(PluginsConfigSection)`, so the
   * result is typed; `undefined` when this config holds no such section.
   */
  public getSection<T extends ConfigSection>(type: ConfigSectionClass<T>): T | undefined {
    const section = this.sections[type.id];
    return section instanceof type ? section : undefined;
  }
}

/** The parsed config file, or `undefined` when no file is there; a file that is there must parse. */
async function readConfigFile(configPath: string): Promise<Record<string, JsonValue> | undefined> {
  const { readFile } = await configFileSystem();
  try {
    return JSON.parse((await readFile(configPath)).toString()) as Record<string, JsonValue>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * The file system the config file lives on. The config file is server-side —
 * a browser is served its config by the app instead — so the import sits
 * behind the SSR flag: the browser build carries no file system at all, and a
 * browser that asks for config gets this error rather than a broken module.
 */
async function configFileSystem(): Promise<typeof FsPromises> {
  if (import.meta.env.SSR) return import('fs/promises');
  throw new Error('The app config file is server-side; a browser cannot read or write it');
}
