/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Events = Record<string, any>;

interface Subscription<T extends Events, K extends keyof T> {
  event: K;
  handler: (_payload: T[K]) => void;
}

function compareSubscriptions(
  a: { event: any; handler: Function },
  b: { event: any; handler: Function }
): boolean {
  return a.event === b.event && a.handler === b.handler;
}

export class Subscribable<T extends Events> {
  private subscribers: Subscription<T, any>[] = [];

  private add<K extends keyof T>(subscriber: Subscription<T, K>): void {
    if (this.subscribers.findIndex((s) => compareSubscriptions(subscriber, s)) !== -1) return;
    this.subscribers.push(subscriber);
  }

  private delete<K extends keyof T>(subscriber: Subscription<T, K>): void {
    this.subscribers = this.subscribers.filter((s) => !compareSubscriptions(subscriber, s));
  }

  public fire<K extends keyof T>(event: K, payload: T[K]): void {
    for (const callback of this.subscribers.filter((s) => s.event === event)) {
      callback.handler(payload);
    }
  }

  public subscribe<K extends keyof T>(event: K, handler: (_payload: T[K]) => void): () => void {
    this.add({ event, handler });

    return () => {
      this.delete({ event, handler });
    };
  }
}
