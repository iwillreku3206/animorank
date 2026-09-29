import { describe, expect, it } from 'vitest';
import { CodeExecutorRegistry } from './codeExecutorRegistry';
import { Judge0Executor } from './judge0';
import { Registrar } from '$lib/registry/registrar';
import { CLanguage } from '$lib/language/c';

describe('CodeExecutorRegistry', () => {
  it('registers the built-in Judge0 executor on construction', () => {
    const registry = new CodeExecutorRegistry();
    expect(registry.keys()).toEqual(['default']);
  });

  it('returns the default executor for a language, resolved by language id', async () => {
    const registry = new CodeExecutorRegistry();

    // A fresh instance must resolve through the language id — never through
    // object identity (executors and callers each mint their own instances).
    await expect(registry.getDefaultForLanguage(new CLanguage())).resolves.toBeInstanceOf(Judge0Executor);
  });

  it('returns undefined for a language no executor supports', async () => {
    const registry = new CodeExecutorRegistry();

    class FakeLanguage extends CLanguage {
      public static id = 'fake';
    }

    await expect(registry.getDefaultForLanguage(new FakeLanguage())).resolves.toBeUndefined();
  });

  it('never throws — lookups are undefinable', async () => {
    const registry = new CodeExecutorRegistry();

    class FakeLanguage extends CLanguage {
      public static id = 'nope';
    }

    await expect(registry.getDefaultForLanguage(new CLanguage())).resolves.toBeInstanceOf(Judge0Executor);
    await expect(registry.getDefaultForLanguage(new FakeLanguage())).resolves.toBeUndefined();
  });

  it('keeps the language map in sync for plugin registrations through a registrar', async () => {
    const registry = new CodeExecutorRegistry();

    class CustomLanguage extends CLanguage {
      public static override id = 'custom';
    }
    class CustomExecutor extends Judge0Executor {
      public static override id = 'custom';
      public static override languages() {
        return [new CustomLanguage()];
      }
    }

    new Registrar(registry, 'plugin-a').register('custom', CustomExecutor);

    expect(registry.keys()).toEqual(['default', 'plugin-a:custom']);
    await expect(registry.getDefaultForLanguage(new CustomLanguage())).resolves.toBeInstanceOf(CustomExecutor);
    await expect(registry.getDefaultForLanguage(new CLanguage())).resolves.toBeInstanceOf(Judge0Executor);

    // Attribution survives the override: the plugin that registered the key is
    // its writer, which is what `/api/plugin/registryWriters` reports.
    expect(registry.registeredBy('plugin-a:custom')).toBe('plugin-a');
    expect(registry.writers()).toContain('plugin-a');
  });
});
