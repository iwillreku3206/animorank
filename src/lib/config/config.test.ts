import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfig } from './config';
import { ConfigSectionRegistry } from './registry';
import { PluginsConfigSection } from './sections/plugins';

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'app-config-'));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('AppConfig.loadConfig', () => {
  it('hydrates every section from its key in the config file', async () => {
    await fs.writeFile(path.join(root, 'config.json'), JSON.stringify({ plugins: { pluginDir: 'plugins' } }));

    const config = await AppConfig.loadConfig(new ConfigSectionRegistry(), path.join(root, 'config.json'));

    expect(config.getSection(PluginsConfigSection)?.data).toEqual({ pluginDir: 'plugins' });
  });

  it('reads an unconfigured config when the file is not there, and writes nothing', async () => {
    const config = await AppConfig.loadConfig(new ConfigSectionRegistry(), path.join(root, 'config.json'));

    expect(config.getSection(PluginsConfigSection)?.data).toBeUndefined();
    await expect(fs.stat(path.join(root, 'config.json'))).rejects.toThrow('ENOENT');
  });

  it('rejects a config file that does not parse', async () => {
    await fs.writeFile(path.join(root, 'config.json'), 'not json');

    await expect(AppConfig.loadConfig(new ConfigSectionRegistry(), path.join(root, 'config.json'))).rejects.toThrow(
      SyntaxError
    );
  });
});
