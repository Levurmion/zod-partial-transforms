export type IsObject<T> = T extends object
  ? T extends unknown[]
    ? false
    : true
  : false;

export type IsArray<T> = T extends unknown[] ? true : false;

export type IsTuple<T> = T extends readonly [...unknown[]]
  ? number extends T["length"]
    ? false // it's an array
    : true // it's a tuple
  : false;

export type PickLikeValue<T, V> = IsObject<T> extends true
  ? { [K in keyof T as V extends T[K] ? K : never]: T[K] }
  : never;
