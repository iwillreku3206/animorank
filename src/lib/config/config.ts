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

  /**
   * The write in flight, if one is: saves are chained onto it so two of them
   * can never be mid-write at the same time (see {@link save}).
   */
  private saving: Promise<void> = Promise.resolve();

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

  /**
   * Write the config file. The JSON is taken here, synchronously, so a save
   * always writes the state at the moment it was asked to; the write itself is
   * queued behind any other save, and lands through a temporary file and a
   * rename, so a reader (or a crash) never sees a half-written config.
   *
   * A section nothing configured is left out of the file rather than written as
   * nothing, which is what makes a load-and-save round trip change nothing.
   *
   * A failed save rejects its own callers and leaves the queue usable: the
   * next save still runs.
   */
  public save(): Promise<void> {
    const json = JSON.stringify(configuredSections(this.sections), null, 2);
    const write = this.saving.then(() => writeFileAtomically(this.path, json));
    this.saving = write.catch(() => undefined);
    return write;
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
 * The sections a save writes: those holding data. A section with nothing in it
 * cannot be represented as JSON (`toJsonValue` refuses `undefined`), and leaving
 * it out is what the file means by not naming it — so a load-and-save round trip
 * keeps an unconfigured section unconfigured.
 */
function configuredSections(sections: Sections): Sections {
  return Object.fromEntries(Object.entries(sections).filter(([, section]) => section.data !== undefined));
}

/**
 * Write `contents` to `file` so the file is only ever seen whole: the bytes go
 * to a temporary sibling first, and the rename that publishes them is atomic
 * within a directory. The temporary name is fixed, which is safe because saves
 * are serialized (see {@link AppConfig.save}).
 */
async function writeFileAtomically(file: string, contents: string): Promise<void> {
  const { writeFile, rename } = await configFileSystem();
  const temporary = `${file}.tmp`;
  await writeFile(temporary, contents);
  await rename(temporary, file);
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
