import { describe, expect, it } from 'vitest';
import { prebuiltPluginEntries } from '../../../scripts/prebuiltPluginEntries';
import type { Plugin } from 'vite';

// The prebuilt plugin descriptors name the chunks this build emits, so a build
// whose chunk naming the plugin cannot follow must fail the build — quietly
// skipping would leave the descriptors pointing at URLs nothing emitted, and
// the browser would only find out with a 404. The subject is the build script
// itself; it is tested from here because vitest's include list covers `src/`.

/** The `config` hook the plugin registers, as Vite calls it. */
function configHook(): (_userConfig: Record<string, unknown>, _env: { command: string }) => void {
  return (prebuiltPluginEntries() as Plugin).config as never;
}

const build = { command: 'build' };

describe('prebuilt plugin entries plugin', () => {
  it('throws when the client build configures no single output object', () => {
    expect(() => configHook()({ build: { rollupOptions: { output: [] } } }, build)).toThrow(/one rollup output object/);
    expect(() => configHook()({ build: {} }, build)).toThrow(/one rollup output object/);
  });

  it('throws when the output names chunks with anything but a pattern', () => {
    expect(() =>
      configHook()({ build: { rollupOptions: { output: { chunkFileNames: () => 'chunk.js' } } } }, build)
    ).toThrow(/pattern/);
  });

  it('accepts a build that names its chunks with a pattern', () => {
    const output = { chunkFileNames: '_app/immutable/chunks/[hash].js' };

    expect(() => configHook()({ build: { rollupOptions: { output } } }, build)).not.toThrow();
  });

  it('leaves the server build and the dev server alone', () => {
    expect(() => configHook()({ build: { ssr: true, rollupOptions: { output: [] } } }, build)).not.toThrow();
    expect(() => configHook()({ build: { rollupOptions: { output: [] } } }, { command: 'serve' })).not.toThrow();
  });
});
