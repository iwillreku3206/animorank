import { describe, expect, it } from 'vitest';
import { ServiceRegistry } from '.';

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
