import { describe, expect, it } from 'vitest';
import { Registrar } from './registrar';
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { CLanguage } from '$lib/language/c';

class MyLanguage extends CLanguage {
  public static override id = 'mylang';
}

describe('Registrar', () => {
  it('registers a class under a namespaced key that the registry resolves', async () => {
    const registry = new LanguageRegistry();
    new Registrar(registry, 'plugin-a').register('mylang', MyLanguage);

    expect(registry.keys()).toEqual(['c', 'plugin-a:mylang']);
    expect(await registry.getInstance('plugin-a:mylang')).toBeInstanceOf(MyLanguage);
  });

  it('registers a singleton instance that stays identical across lookups', async () => {
    const registry = new LanguageRegistry();
    const instance = new MyLanguage();
    new Registrar(registry, 'plugin-a').registerSingleton('instance', instance);

    expect(await registry.getInstance('plugin-a:instance')).toBe(instance);
    expect(await registry.getInstance('plugin-a:instance')).toBe(instance);
  });

  it('resolves lazily registered classes and instances', async () => {
    const registry = new LanguageRegistry();
    const registrar = new Registrar(registry, 'plugin-a');
    let classLoads = 0;
    let instanceLoads = 0;
    registrar.registerLazy('lazy-class', async () => {
      classLoads += 1;
      return MyLanguage;
    });
    registrar.registerSingletonLazy('lazy-instance', async () => {
      instanceLoads += 1;
      return new MyLanguage();
    });

    expect(await registry.getInstance('plugin-a:lazy-class')).toBeInstanceOf(MyLanguage);
    expect(await registry.getInstance('plugin-a:lazy-instance')).toBeInstanceOf(MyLanguage);
    expect(await registry.getInstance('plugin-a:lazy-instance')).toBe(
      await registry.getInstance('plugin-a:lazy-instance')
    );
    expect(classLoads).toBe(1);
    expect(instanceLoads).toBe(1);
  });

  it('rejects a key that is already registered in the same namespace', () => {
    const registry = new LanguageRegistry();
    const registrar = new Registrar(registry, 'plugin-a');
    registrar.register('mylang', MyLanguage);

    expect(() => registrar.register('mylang', MyLanguage)).toThrow(/already exists/);
  });

  it('keeps namespaces of different plugins apart', () => {
    const registry = new LanguageRegistry();
    new Registrar(registry, 'plugin-a').register('mylang', MyLanguage);
    new Registrar(registry, 'plugin-b').registerSingleton('mylang', new MyLanguage());

    expect(registry.keys()).toEqual(['c', 'plugin-a:mylang', 'plugin-b:mylang']);
  });

  it('leaves ServiceRegistry.register unreachable from the outside', () => {
    const registry = new LanguageRegistry();
    // @ts-expect-error `register` is protected on ServiceRegistry
    const write = (key: string, value: typeof CLanguage) => registry.register(key, value);

    expect(typeof write).toBe('function');
    expect(() => Object.getPrototypeOf(registry).register.call(registry, 'c', CLanguage)).toThrow(/already exists/);
  });
});
