import type { IsLiteral, IsTuple } from "type-fest";
import type { Call, FunctionType, IsObject, MergeObjectIO } from "./types";
import * as z from "zod/v4";
import * as core from "zod/v4/core";

// ===== NAKED TYPES =====

type StringTypes =
  | z.ZodString
  | z.ZodStringFormat
  | z.ZodGUID
  | z.ZodUUID
  | z.ZodEmail
  | z.ZodURL
  | z.ZodEmoji
  | z.ZodNanoID
  | z.ZodCUID
  | z.ZodCUID2
  | z.ZodULID
  | z.ZodXID
  | z.ZodKSUID
  | z.ZodISODateTime
  | z.ZodISODate
  | z.ZodISOTime
  | z.ZodISODuration
  | z.ZodIPv4
  | z.ZodIPv6
  | z.ZodCIDRv4
  | z.ZodCIDRv6
  | z.ZodBase64
  | z.ZodBase64URL
  | z.ZodE164
  | z.ZodJWT;

type NumberTypes =
  | z.ZodNumber
  | z.ZodNumberFormat
  | z.ZodBigInt
  | z.ZodBigIntFormat;

type UndefinedTypes = z.ZodUndefined;

type NullTypes = z.ZodNull;

type SymbolTypes = z.ZodSymbol;

type DateTypes = z.ZodDate;

type BooleanTypes = z.ZodBoolean | TypedZodPipe<z.ZodBoolean>;

type ConfigNakedTypesMap =
  | [string, StringTypes]
  | [number, NumberTypes]
  | [undefined, UndefinedTypes]
  | [null, NullTypes]
  | [symbol, SymbolTypes]
  | [Date, DateTypes]
  | [boolean, BooleanTypes];

type OriginalNakedTypes = ConfigNakedTypesMap[0];

type GetConfigNakedType<O> =
  | Extract<ConfigNakedTypesMap, [O, unknown]>[1]
  | TypedZodPipe<Extract<ConfigNakedTypesMap, [O, unknown]>[1]>;

type TypedZodPipe<InputSchema extends z.ZodType> = z.ZodPipe<
  InputSchema,
  core.SomeType
>;

// ===== ALL TYPES =====

// permitted types that can be mapped to Zod types and builders

export type OriginalTypes =
  | OriginalNakedTypes
  | OriginalObjectType
  | OriginalArrayType;

type OriginalObjectType = { [k: string]: OriginalTypes };
type OriginalArrayType = OriginalTypes[];

// ===== CONFIG CREATOR GENERIC =====

export type CreateConfig<O extends OriginalTypes> = IsLiteral<O> extends true
  ? CreateConfig_Literal<O>
  : // booleans need to be handled separately as it is a union of true | false
  O extends boolean
  ? BooleanTypes
  : O extends OriginalObjectType
  ? CreateConfig_Object<O>
  : O extends OriginalArrayType
  ? IsTuple<O> extends true
    ? CreateConfig_Tuple<O>
    : CreateConfig_Array<O>
  : GetConfigNakedType<O>;

type CreateConfig_Literal<O> = z.ZodLiteral<Extract<O, z.util.Literal>>;

type CreateConfig_Object<O extends OriginalObjectType = OriginalObjectType> =
  (opt: {
    object: <Shape extends CreateObjectShape<O>>(
      config: Shape
    ) => ResolveObjectConfig<Shape, O>;
  }) => z.ZodType;

type CreateObjectShape<O extends OriginalObjectType> = {
  [K in keyof O]?: CreateConfig<O[K]>;
};

type CreateConfig_Array<O extends OriginalArrayType> = (opt: {
  array: <Shape extends CreateArrayShape<O>>(
    config: Shape
  ) => ResolveArrayConfig<Shape>;
}) => z.ZodType;

type CreateArrayShape<O extends OriginalArrayType> = CreateConfig<O[number]>[];

type CreateConfig_Tuple<O extends OriginalArrayType> = (opt: {
  tuple: <Shape extends CreateTupleShape<O>>(
    config: Shape
  ) => ResolveTupleConfig<Shape>;
}) => z.ZodType;

type CreateTupleShape<O extends OriginalArrayType> = O extends [
  infer First extends OriginalTypes,
  ...infer Rest extends OriginalArrayType
]
  ? [CreateConfig<First>, ...CreateTupleShape<Rest>]
  : [];

// ===== CONFIG RESOLVER =====
type ResolveConfig<Config> = Config extends FunctionType
  ? Call<Config>
  : Config extends z.ZodType
  ? Config
  : never;

type ResolveObjectConfig<
  Config,
  Original extends OriginalObjectType
> = IsObject<Config> extends true
  ? {
      // remove undefined as this is a side effect of applying Partial
      [K in keyof Config]: Exclude<Config[K], undefined> extends infer Value
        ? ResolveConfig<Value>
        : never;
      // ensure that the resolved shape extends ZodShape required by objects
    } extends infer ResolvedShape extends core.$ZodShape
    ? // create a ZodObject with a type signature that preserves properties in Original undeclared in ResolvedShape
      z.ZodObject<
        ResolvedShape,
        {
          in: MergeObjectIO<Original, ResolvedShape, "input">;
          out: MergeObjectIO<Original, ResolvedShape, "output">;
        }
      >
    : never
  : never;

type ResolveArrayConfig<Config extends unknown[]> = ResolveConfig<
  Config[number]
> extends infer ResolvedElements extends core.SomeType
  ? z.ZodArray<ResolvedElements>
  : never;

type ResolveTupleConfig<Config extends readonly unknown[]> =
  ResolveTupleConfig_Rec<Config> extends infer ResolvedElements extends z.util.TupleItems
    ? z.ZodTuple<ResolvedElements>
    : never;

type ResolveTupleConfig_Rec<Config extends readonly unknown[]> =
  Config extends [infer First, ...infer Rest]
    ? [ResolveConfig<First>, ...ResolveTupleConfig_Rec<Rest>]
    : [];
