export function arrayToHashMap<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (_item: T) => K
) {
  const map = {};
  array.forEach((item) => {
    (map as Record<K, T>)[keyFn(item)] = item;
  });
  return map as Record<K, T>;
}
