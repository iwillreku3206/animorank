import { describe, expect, it } from 'vitest';
import { CodeExecutorRegistry } from './codeExecutorRegistry';
import { Judge0Executor } from './judge0';
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
});
