import { Logger } from '$lib/logging/logger';
import { ServerRegistryProvider } from '$lib/registry/server';
import path from 'path';
import type { Plugin } from './plugin';
import fs from 'fs/promises';
import { PluginManifestSchema } from './manifest';

export class PluginLoader {
  private plugins: Plugin[] = [];

  // eslint-disable-next-line no-unused-vars
  constructor(private pluginPath: string = '') {}

  public async loadDynamicPlugins() {
    const logger = await ServerRegistryProvider.instance().getService(Logger, 'r');
    (await fs.readdir(this.pluginPath)).map((dirname) =>
      (async () => {
        const pluginDir = path.join(this.pluginPath, dirname);
        if (!(await fs.stat(pluginDir)).isDirectory()) {
          logger.warning(`Non-directory detected in plugin directory: ${dirname}`);
          return;
        }
      })()
    );
  }

  private async loadDynamicPlugin(dir: string): Promise<Plugin> {
    const manifestRaw = (await fs.readFile(path.join(dir, 'manifest.json'))).toString('utf8');
    const manifestParsed = JSON.parse(manifestRaw);
    const manifest = PluginManifestSchema.parse(manifestParsed);
  }

  public async loadPrebuiltPlugins() {}
}
