import { describe, expect, it } from 'vitest';
import { CodeExecutorRegistry } from './codeExecutorRegistry';
import { Judge0Executor } from './judge0';
import { CLanguage } from '$lib/language/c';

describe('CodeExecutorRegistry', () => {
  it('returns the default executor for a language, resolved by language id', () => {
    const registry = new CodeExecutorRegistry();
    registry.registerCodeExecutor(Judge0Executor);

    // A fresh instance must resolve through the language id — never through
    // object identity (executors and callers each mint their own instances).
    expect(registry.getDefaultForLanguage(new CLanguage())).toBeInstanceOf(Judge0Executor);
  });

  it('returns undefined for a language no executor supports', () => {
    const registry = new CodeExecutorRegistry();
    registry.registerCodeExecutor(Judge0Executor);

    class FakeLanguage extends CLanguage {
      public static id = 'fake';
    }

    expect(registry.getDefaultForLanguage(new FakeLanguage())).toBeUndefined();
  });

  it('returns undefined for an empty registry', () => {
    const registry = new CodeExecutorRegistry();
    expect(registry.getDefaultForLanguage(new CLanguage())).toBeUndefined();
  });

  it('never throws — lookups are undefinable', () => {
    const registry = new CodeExecutorRegistry();
    registry.registerCodeExecutor(Judge0Executor);

    class FakeLanguage extends CLanguage {
      public static id = 'nope';
    }

    expect(() => registry.getDefaultForLanguage(new CLanguage())).not.toThrow();
    expect(() => registry.getDefaultForLanguage(new FakeLanguage())).not.toThrow();
    expect(registry.getDefaultForLanguage(new FakeLanguage())).toBeUndefined();
  });
});
