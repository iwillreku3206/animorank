import { beforeEach, describe, expect, it } from 'vitest';
import { ReadOnlyRegistry } from './readOnlyRegistry';
import { Registrar } from './registrar';
import { ServiceRegistry } from '.';
import { LanguageRegistry } from '$lib/language/languageRegistry';
import { CLanguage } from '$lib/language/c';

class MyLanguage extends CLanguage {
  public static override id = 'mylang';
}

class CountingLanguage extends CLanguage {
  public static override id = 'counting';
  public static instances = 0;
  public constructor() {
    super();
    CountingLanguage.instances += 1;
  }
}

describe('ReadOnlyRegistry', () => {
  let registry: LanguageRegistry;
  let readOnly: ReadOnlyRegistry<LanguageRegistry>;

  beforeEach(() => {
    registry = new LanguageRegistry();
    const registrar = new Registrar(registry, 'plugin-a');
    registrar.register('counting', CountingLanguage);
    registrar.registerSingleton('instance', new MyLanguage());
    readOnly = new ReadOnlyRegistry(registry);
  });

  it('exposes the wrapped registry keys', () => {
    expect(readOnly.keys()).toEqual(registry.keys());
    expect(readOnly.keys()).toEqual(['c', 'plugin-a:counting', 'plugin-a:instance']);
  });

  it('resolves statics and instances exactly like the registry does', async () => {
    expect(await readOnly.getStatic('c')).toBe(CLanguage);
    expect(await readOnly.getInstance('c')).toBeInstanceOf(CLanguage);
    await expect(readOnly.getInstance('plugin-a:missing')).rejects.toThrow(/not found/);
  });

  it('preserves singleton identity and mints instances for class entries', async () => {
    expect(await readOnly.getInstance('plugin-a:instance')).toBe(await registry.getInstance('plugin-a:instance'));

    CountingLanguage.instances = 0;
    expect(await readOnly.getInstance('plugin-a:counting')).not.toBe(await readOnly.getInstance('plugin-a:counting'));
    expect(CountingLanguage.instances).toBe(2);
  });

  it('resolves the default key', async () => {
    const registryDefault = ServiceRegistry.createSingleServiceRegistry(MyLanguage);
    const readOnlyDefault = new ReadOnlyRegistry(registryDefault);
    expect(await readOnlyDefault.getDefault()).toBeInstanceOf(MyLanguage);
  });

  it('does not expose registration', () => {
    expect('register' in readOnly).toBe(false);
    // @ts-expect-error ReadOnlyRegistry has no write surface
    expect(() => readOnly.register('x', MyLanguage)).toThrow();
  });
});
