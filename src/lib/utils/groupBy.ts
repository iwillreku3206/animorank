// https://stackoverflow.com/a/62765924
export const groupBy = <T, K extends string | number | symbol>(arr: T[], key: (_i: T) => K) =>
  arr.reduce(
    (groups, item) => {
      (groups[key(item)] ||= []).push(item);
      return groups;
    },
    {} as Record<K, T[]>
  );
