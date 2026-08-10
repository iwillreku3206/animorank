export function arrayToHashMap<T, K extends string | number | symbol>(array: T[], keyFn: (_item: T) => K) {
  const map = {};
  array.forEach((item) => {
    // We know that this is an empty hashmap that we will fill up with keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any)[keyFn(item)] = item;
  });
  return map as Record<K, T>;
}
