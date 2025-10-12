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

type GetZodType<T> = Extract<
  ValueOf<Pick<ZodDataTypes, keyof PickLikeValue<DataTypes, T>>>,
  core.$ZodType
>;

type IncludeZodPipe<T, ZodType extends core.$ZodType> = core.$ZodPipe<
  ZodType,
  core.$ZodTransform<unknown, T>
>;

type GetZodTypeWithPipe<T> = GetZodType<T> | IncludeZodPipe<T, GetZodType<T>>;

type ExtractZodType<T> = Extract<T, core.$ZodType>;

export type MapTypeToZodType<T> = IsLiteral<T> extends true
  ? MapTypeToZodType_Literal<T>
  : IsObject<T> extends true
  ? MapTypeToZodType_Object<T>
  : T extends unknown[]
  ? IsTuple<T> extends true
    ? MapTypeToZodType_Tuple<T>
    : IsArray<T> extends true
    ? MapTypeToZodType_Array<T>
    : core.$ZodNever
  : GetZodTypeWithPipe<T>;

type MapTypeToZodType_Object<T> =
  | core.$ZodObject<{
      [K in keyof T]: MapTypeToZodType<T[K]>;
    }>
  | IncludeZodPipe<
      T,
      core.$ZodObject<{
        [K in keyof T]: MapTypeToZodType<T[K]>;
      }>
    >;

type MapTypeToZodType_Tuple<T extends unknown[]> =
  | core.$ZodTuple<MapTypeToZodType_Tuple_Impl<T>>
  | IncludeZodPipe<T, core.$ZodTuple<MapTypeToZodType_Tuple_Impl<T>>>;

type MapTypeToZodType_Tuple_Impl<T extends unknown[]> = [] extends T
  ? []
  : T extends [infer First, ...infer Rest]
  ? [MapTypeToZodType<First>, ...MapTypeToZodType_Tuple_Impl<Rest>]
  : never;

type MapTypeToZodType_Array<T extends unknown[]> =
  | core.$ZodArray<ExtractZodType<MapTypeToZodType<T[number]>>>
  | IncludeZodPipe<
      T,
      core.$ZodArray<ExtractZodType<MapTypeToZodType<T[number]>>>
    >;

type MapTypeToZodType_Literal<T> =
  | core.$ZodLiteral<Extract<T, core.util.Literal>>
  | IncludeZodPipe<T, core.$ZodLiteral<Extract<T, core.util.Literal>>>;
