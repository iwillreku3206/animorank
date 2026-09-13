import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { GET as getCatalog } from '../../routes/plugins/+server';
import { GET as getFile } from '../../routes/plugins/[id]/[...file]/+server';
import { LoadedPlugin } from './loadedPlugin';

type FileEvent = Parameters<typeof getFile>[0];
type CatalogEvent = Parameters<typeof getCatalog>[0];

const plugins: LoadedPlugin[] = [];

// The routes read the loaded registry; stand it in so the handlers run for real
// against a plugin loaded from a temp directory.
vi.mock('$lib/plugin/serverService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./serverService')>();
  return {
    ...actual,
    ServerPluginService: {
      instance: () => ({
        getClientCatalog: async () => actual.dynamicClientCatalogOf(plugins),
        readPluginFile: async (id: string, file: string) => actual.pluginFileOf(plugins, id, file)
      })
    }
  };
});

const { PluginLoader } = await import('./loader');

let root: string;

beforeEach(async () => {
  plugins.length = 0;
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-route-'));
  const dir = path.join(root, 'demo');
  await fs.mkdir(path.join(dir, 'client'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'manifest.json'),
    JSON.stringify({
      id: 'demo',
      manifestVersion: '0',
      name: 'Demo Plugin',
      author: 'tester',
      version: '1.0.0',
      category: ['test']
    })
  );
  await fs.writeFile(path.join(dir, 'client.js'), "import './client/helper.js';\n");
  await fs.writeFile(path.join(dir, 'client/helper.js'), 'export const helper = 1;\n');
  await fs.writeFile(path.join(dir, 'client/helper.ts'), 'export const helper = 1;\n');
  await fs.writeFile(path.join(dir, 'client/style.css'), '.demo { color: red; }\n');
  await fs.mkdir(path.join(dir, 'client/assets'), { recursive: true });
  await fs.writeFile(path.join(dir, 'client/assets/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');
  await fs.writeFile(path.join(dir, 'client/notes.txt'), 'notes\n');
  await fs.writeFile(path.join(dir, 'server.js'), 'export default class Demo { async init() {} }\n');

  const loader = new PluginLoader();
  plugins.push(...(await loader.loadDynamicPlugins(root)));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

function event(id: string, file: string): FileEvent {
  return {
    params: { id, file },
    request: new Request('http://localhost/plugins'),
    url: new URL('http://localhost/plugins')
  } as unknown as FileEvent;
}

function catalogEvent(): CatalogEvent {
  return {
    params: {},
    request: new Request('http://localhost/plugins'),
    url: new URL('http://localhost/plugins')
  } as unknown as CatalogEvent;
}

describe('plugin file route', () => {
  it('serves the client entry with a JavaScript content type', async () => {
    const response = await getFile(event('demo', 'client.js'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript');
    await expect(response.text()).resolves.toBe("import './client/helper.js';\n");
  });

  it('serves nested assets with a content type from their extension', async () => {
    const response = await getFile(event('demo', 'client/helper.js'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript');
  });

  it('serves TypeScript assets as JavaScript, not as the mime database video type', async () => {
    const response = await getFile(event('demo', 'client/helper.ts'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript');
  });

  it.each([
    ['client/style.css', 'text/css'],
    ['client/assets/logo.svg', 'image/svg+xml'],
    ['client/notes.txt', 'text/plain']
  ])('serves %s as %s', async (file, contentType) => {
    const response = await getFile(event('demo', file));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(contentType);
  });

  it('404s for a file the plugin does not ship', async () => {
    await expect(getFile(event('demo', 'server.js'))).rejects.toSatisfy(
      (error: unknown) => isHttpError(error) && error.status === 404
    );
  });

  it('404s for an unknown plugin and for traversal attempts', async () => {
    for (const [id, file] of [
      ['other', 'client.js'],
      ['demo', '../demo/client.js'],
      ['demo', '/etc/passwd']
    ]) {
      await expect(getFile(event(id, file))).rejects.toSatisfy(
        (error: unknown) => isHttpError(error) && error.status === 404
      );
    }
  });
});

describe('plugin catalog route', () => {
  it('lists the plugins the browser may load', async () => {
    const response = await getCatalog(catalogEvent());
    const body = (await response.json()) as { plugins: { id: string; clientUrl: string }[] };

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(body.plugins).toEqual([expect.objectContaining({ id: 'demo', clientUrl: '/plugins/demo/client.js' })]);
  });
});
