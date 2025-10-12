import * as core from "zod/v4/core";
import type { IsArray, IsObject, PickLikeValue } from "./types";
import type { IsLiteral, IsTuple, ValueOf } from "type-fest";

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

type ZodUndefinedTypes = core.$ZodUndefined;

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
};

type ZodDataTypes = {
  string: ZodStringTypes;
  number: ZodNumberTypes;
  undefined: ZodUndefinedTypes;
  null: core.$ZodNull;
  boolean: core.$ZodBoolean<boolean>;
  symbol: core.$ZodSymbol;
  date: core.$ZodDate;
  object: core.$ZodObject;
  array: core.$ZodArray;
  tuple: core.$ZodTuple;
  never: core.$ZodNever;
};

type GetZodTypeFor<T> = Extract<
  ValueOf<Pick<ZodDataTypes, keyof PickLikeValue<DataTypes, T>>>,
  core.$ZodType
>;

type ExtractZodType<T> = Extract<T, core.$ZodType>;

export type MapTypeToZodType<T> = IsLiteral<T> extends true
  ? MapTypeToZodType_Literal<T>
  : IsObject<T> extends true
  ? core.$ZodObject<MapTypeToZodType_Object<T>>
  : T extends unknown[]
  ? IsTuple<T> extends true
    ? core.$ZodTuple<MapTypeToZodType_Tuple<T>>
    : IsArray<T> extends true
    ? core.$ZodArray<MapTypeToZodType_Array<T>>
    : core.$ZodNever
  : GetZodTypeFor<T>;

type MapTypeToZodType_Object<T> = {
  [K in keyof T]: MapTypeToZodType<T[K]>;
};

type MapTypeToZodType_Tuple<T extends unknown[]> = [] extends T
  ? []
  : T extends [infer First, ...infer Rest]
  ? [MapTypeToZodType<First>, ...MapTypeToZodType_Tuple<Rest>]
  : never;

type MapTypeToZodType_Array<T extends unknown[]> = ExtractZodType<
  MapTypeToZodType<T[number]>
>;

type MapTypeToZodType_Literal<T> = core.$ZodLiteral<
  Extract<T, core.util.Literal>
>;
