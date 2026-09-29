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

describe('AppConfig.save', () => {
  const configPath = () => path.join(root, 'config.json');

  it('writes the sections and leaves no temporary file behind', async () => {
    const config = await AppConfig.loadConfig(new ConfigSectionRegistry(), configPath());
    config.getSection(PluginsConfigSection)!.data = { pluginDir: 'plugins' };

    await config.save();

    // The web section was never configured, so it is not in the file — and its
    // absence is not an error, which is what a load-and-save has to mean.
    expect(JSON.parse(await fs.readFile(configPath(), 'utf8'))).toEqual({ plugins: { pluginDir: 'plugins' } });
    // The write went through a temporary sibling; it must not survive the save.
    await expect(fs.stat(`${configPath()}.tmp`)).rejects.toThrow('ENOENT');
  });

  it('keeps a section that was configured and drops one that was not', async () => {
    await fs.writeFile(
      path.join(root, 'config.json'),
      JSON.stringify({ web: { host: '0.0.0.0', port: 8080 }, plugins: { pluginDir: 'plugins' } })
    );
    const config = await AppConfig.loadConfig(new ConfigSectionRegistry(), configPath());

    await config.save();

    expect(JSON.parse(await fs.readFile(configPath(), 'utf8'))).toEqual({
      web: { host: '0.0.0.0', port: 8080 },
      plugins: { pluginDir: 'plugins' }
    });
  });

  it('publishes the whole file even when saves overlap', async () => {
    const config = await AppConfig.loadConfig(new ConfigSectionRegistry(), configPath());
    const section = config.getSection(PluginsConfigSection)!;

    const saves: Promise<void>[] = [];
    for (let index = 0; index < 20; index += 1) {
      section.data = { pluginDir: `plugins-${index}` };
      saves.push(config.save());
    }
    await Promise.all(saves);

    // Every save wrote a state that was whole, so the file parses and holds the
    // last one asked for.
    expect(JSON.parse(await fs.readFile(configPath(), 'utf8'))).toEqual({ plugins: { pluginDir: 'plugins-19' } });
    await expect(fs.stat(`${configPath()}.tmp`)).rejects.toThrow('ENOENT');
  });
});
