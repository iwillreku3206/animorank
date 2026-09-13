import { describe, expect, it } from 'vitest';
import { ServiceRegistry } from '.';
import { Registrar } from './registrar';

class CountingService {
  public static instances = 0;
  public static displayName = 'CountingService';
  public constructor() {
    CountingService.instances += 1;
  }
}

class CountingServiceRegistry extends ServiceRegistry<CountingService, [], typeof CountingService> {
  public constructor() {
    super({ keyNotFoundMessage: (key) => `Missing service ${key}` });
    this.registerLazy('lazy', async () => {
      CountingService.instances = 0;
      return CountingService;
    });
  }
}

describe('ServiceRegistry lazy registration', () => {
  it('registerLazy loads the class once and getInstance mints fresh instances', async () => {
    const registry = new CountingServiceRegistry();
    const first = await registry.getInstance('lazy');
    const second = await registry.getInstance('lazy');
    expect(first).toBeInstanceOf(CountingService);
    expect(second).toBeInstanceOf(CountingService);
    expect(first).not.toBe(second);
    expect(CountingService.instances).toBe(2);
    await registry.getInstance('lazy');
    expect(CountingService.instances).toBe(3);
  });

  it('getStatic resolves the class static side of a lazy class entry', async () => {
    const registry = new CountingServiceRegistry();
    const cls = await registry.getStatic('lazy');
    expect(cls).toBe(CountingService);
    expect(cls.displayName).toBe('CountingService');
  });

  it('registerSingletonLazy returns the same instance and exposes it via getStatic', async () => {
    class SingletonService {
      public static displayName = 'SingletonService';
    }
    class SingletonRegistry extends ServiceRegistry<SingletonService, [], typeof SingletonService> {
      public constructor() {
        super();
        this.registerSingletonLazy('singleton', async () => new SingletonService());
      }
    }
    const registry = new SingletonRegistry();
    const first = await registry.getInstance('singleton');
    const second = await registry.getInstance('singleton');
    expect(first).toBe(second);
    const staticSide = await registry.getStatic('singleton');
    expect(staticSide).toBe(first);
  });

  it('concurrent accesses share a single in-flight load', async () => {
    let loaderCalls = 0;
    class LazyService {}
    class LazyRegistry extends ServiceRegistry<LazyService, [], object> {
      public constructor() {
        super();
        this.registerLazy('lazy', async () => {
          loaderCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return LazyService;
        });
      }
    }
    const registry = new LazyRegistry();
    const [instance, cls] = await Promise.all([registry.getInstance('lazy'), registry.getStatic('lazy')]);
    expect(instance).toBeInstanceOf(LazyService);
    expect(cls).toBe(LazyService);
    expect(loaderCalls).toBe(1);
  });

  it('throws the key-not-found error for unknown keys', async () => {
    const registry = new CountingServiceRegistry();
    await expect(registry.getInstance('missing')).rejects.toThrow('Missing service missing');
    await expect(registry.getStatic('missing')).rejects.toThrow('Missing service missing');
  });

  it('propagates loader rejection and retries successfully afterwards', async () => {
    let shouldFail = true;
    class RetryService {}
    class RetryRegistry extends ServiceRegistry<RetryService, [], object> {
      public constructor() {
        super();
        this.registerLazy('lazy', async () => {
          if (shouldFail) throw new Error('loader failed');
          return RetryService;
        });
      }
    }
    const registry = new RetryRegistry();
    await expect(registry.getInstance('lazy')).rejects.toThrow('loader failed');
    shouldFail = false;
    const instance = await registry.getInstance('lazy');
    expect(instance).toBeInstanceOf(RetryService);
  });

  it('getDefault resolves the default key', async () => {
    class DefaultService {}
    const registry = ServiceRegistry.createSingleServiceRegistry(DefaultService);
    const instance = await registry.getDefault();
    expect(instance).toBeInstanceOf(DefaultService);
  });
});

describe('ServiceRegistry registration tracking', () => {
  it('reports the namespace each registration was written under', () => {
    const registry = new CountingServiceRegistry();
    new Registrar(registry, 'plugin-a').register('mine', CountingService);
    new Registrar(registry, '', 'plugin-b').register('plain', CountingService);

    expect(registry.registeredBy('plugin-a:mine')).toBe('plugin-a');
    // An un-namespaced key still belongs to the plugin that wrote it.
    expect(registry.registeredBy('plain')).toBe('plugin-b');
    expect(registry.registeredBy('unknown')).toBeUndefined();
  });

  it('falls back to the registry default origin for keys registered without one', () => {
    const registry = new CountingServiceRegistry();
    expect(registry.registeredBy('lazy')).toBeUndefined();

    registry.setDefaultOrigin('animorank');
    expect(registry.registeredBy('lazy')).toBe('animorank');
    // A key that was never registered stays unknown.
    expect(registry.registeredBy('missing')).toBeUndefined();
  });

  it('lets the miss resolver provide a key and retries the lookup once', async () => {
    const registry = new CountingServiceRegistry();
    const asked: string[] = [];
    registry.setMissResolver(async (target, key) => {
      asked.push(key);
      new Registrar(target, '', 'plugin-a').register(key, CountingService);
    });

    await expect(registry.getInstance('late')).resolves.toBeInstanceOf(CountingService);
    expect(asked).toEqual(['late']);
    expect(registry.registeredBy('late')).toBe('plugin-a');
  });

  it('reports the missing key when the miss resolver cannot provide it', async () => {
    const registry = new CountingServiceRegistry();
    let calls = 0;
    registry.setMissResolver(async () => {
      calls += 1;
    });

    await expect(registry.getInstance('missing')).rejects.toThrow('Missing service missing');
    expect(calls).toBe(1);
  });

  it('reports the namespaces that wrote into the registry', () => {
    const registry = new CountingServiceRegistry();
    registry.setDefaultOrigin('animorank');
    new Registrar(registry, 'plugin-a').register('mine', CountingService);
    new Registrar(registry, '', 'plugin-b').register('plain', CountingService);

    expect(registry.writers().sort()).toEqual(['animorank', 'plugin-a', 'plugin-b']);
  });

  it('loads the writers before reporting every key', async () => {
    const registry = new CountingServiceRegistry();
    let calls = 0;
    registry.setWritersResolver(async (target) => {
      calls += 1;
      new Registrar(target, '', 'plugin-a').register('extra', CountingService);
    });

    expect(registry.keys()).not.toContain('extra');
    await expect(registry.loadKeys()).resolves.toContain('extra');
    expect(calls).toBe(1);
  });
});
