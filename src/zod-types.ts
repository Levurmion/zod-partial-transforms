import * as core from "zod/v4/core";
import type { IsArray, IsObject, PickLikeValue } from "./types";
import type { IsTuple, ValueOf } from "type-fest";

type ZodStringTypes =
  | core.$ZodString
  | core.$ZodStringFormat
  | core.$ZodGUID
  | core.$ZodUUID
  | core.$ZodEmail
  | core.$ZodURL
  | core.$ZodEmoji
  | core.$ZodNanoID
  | core.$ZodCUID
  | core.$ZodCUID2
  | core.$ZodULID
  | core.$ZodXID
  | core.$ZodKSUID
  | core.$ZodISODateTime
  | core.$ZodISODate
  | core.$ZodISOTime
  | core.$ZodISODuration
  | core.$ZodIPv4
  | core.$ZodIPv6
  | core.$ZodCIDRv4
  | core.$ZodCIDRv6
  | core.$ZodBase64
  | core.$ZodBase64URL
  | core.$ZodE164
  | core.$ZodJWT;

type ZodNumberTypes =
  | core.$ZodNumber
  | core.$ZodNumberFormat
  | core.$ZodBigInt
  | core.$ZodBigIntFormat;

type ZodUndefinedTypes = core.$ZodUndefined | core.$ZodOptional;

type DataTypes = {
  string: string;
  number: number;
  undefined: undefined;
  null: null;
  boolean: boolean;
  symbol: symbol;
  date: Date;
  object: object;
  array: unknown[];
  tuple: unknown[];
  never: never;
  void: void;
};

type ZodDataTypes = {
  string: ZodStringTypes;
  number: ZodNumberTypes;
  undefined: ZodUndefinedTypes;
  null: core.$ZodNull;
  boolean: core.$ZodBoolean;
  symbol: core.$ZodSymbol;
  date: core.$ZodDate;
  object: core.$ZodObject;
  array: core.$ZodArray;
  tuple: core.$ZodTuple;
  never: core.$ZodNever;
  void: core.$ZodVoid;
};

export type GetZodTypeFor<T> = Extract<
  ValueOf<Pick<ZodDataTypes, keyof PickLikeValue<DataTypes, T>>>,
  core.$ZodType
>;

export type MapObjectToZodType<T> = {
  [K in keyof T]: GetZodTypeFor<T[K]>;
};

type ExtractZodType<T> = Extract<T, core.$ZodType>;

export type MapTupleToZodType<T> = T extends [infer First, ...infer Rest]
  ? [RecursivelyMapObjectToZodType<First>, ...MapTupleToZodType<Rest>]
  : [];

export type RecursivelyMapObjectToZodType<T> = IsObject<T> extends true
  ? core.$ZodObject<{
      [K in keyof T]: RecursivelyMapObjectToZodType<T[K]>;
    }>
  : T extends unknown[]
  ? IsTuple<T> extends true
    ? core.$ZodTuple<MapTupleToZodType<T>>
    : IsArray<T> extends true
    ? core.$ZodArray<ExtractZodType<RecursivelyMapObjectToZodType<T[number]>>>
    : core.$ZodNever
  : GetZodTypeFor<T>;
