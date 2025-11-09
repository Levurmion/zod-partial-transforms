import type { IsLiteral, IsTuple, IsUnion } from "type-fest";
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
  | OriginalArrayType
  | OriginalTupleType;

export type OriginalObjectType = { [k: string]: OriginalTypes };
export type OriginalArrayType = OriginalTypes[];
export type OriginalTupleType = readonly OriginalTypes[];

// ===== CONFIG CREATOR GENERIC =====

export type CreateConfig<O extends OriginalTypes> =
  | CreateConfig_Union<O>
  | CreateConfig_Recursive<O>;

type CreateConfig_Recursive<O extends OriginalTypes> = IsLiteral<O> extends true
  ? CreateConfig_Literal<O>
  : O extends boolean
  ? BooleanTypes
  : O extends OriginalObjectType
  ? CreateConfig_Object<O>
  : O extends OriginalArrayType
  ? IsTuple<O> extends true
    ? CreateConfig_Tuple<O>
    : CreateConfig_Array<O>
  : GetConfigNakedType<O>;

type CreateConfig_Union<O extends OriginalTypes = OriginalTypes> =
  IsUnion<O> extends true
    ? (opt: {
        union: <Shape extends CreateUnionShape<O>>(
          config: Shape
        ) => ResolveArrayConfig<Shape>;
      }) => z.ZodType
    : never;

export type CreateUnionShape<O extends OriginalTypes> = (
  | (O extends unknown ? CreateConfig<O> : never)
  | HandleBooleanInUnion<O>
)[];

type HandleBooleanInUnion<O extends OriginalTypes> = [boolean] extends [O]
  ? BooleanTypes
  : never;

type CreateConfig_Literal<O> = z.ZodLiteral<Extract<O, z.util.Literal>>;

type CreateConfig_Object<O extends OriginalObjectType = OriginalObjectType> =
  (opt: {
    object: <Shape extends CreateObjectShape<O>>(
      config: Shape
    ) => ResolveObjectConfig<Shape, O>;
  }) => z.ZodType;

export type CreateObjectShape<O extends OriginalObjectType> = {
  [K in keyof O]?: CreateConfig<O[K]>;
};

export type ObjectShape = { [key: string]: ConfigNode };

type CreateConfig_Array<O extends OriginalArrayType = OriginalArrayType> =
  (opt: {
    array: <Shape extends CreateArrayShape<O>>(
      config: Shape
    ) => ResolveConfig<Shape>;
  }) => z.ZodType;

export type CreateArrayShape<O extends OriginalArrayType = OriginalArrayType> =
  CreateConfig<O[number]>;

export type ArrayShape = ConfigNode[];

type CreateConfig_Tuple<O extends OriginalTupleType = OriginalTupleType> =
  (opt: {
    tuple: <Shape extends CreateTupleShape<O>>(
      config: Shape
    ) => ResolveTupleConfig<Shape>;
  }) => z.ZodType;

export type CreateTupleShape<O extends OriginalTupleType> = O extends [
  infer First extends OriginalTypes,
  ...infer Rest extends OriginalArrayType
]
  ? [CreateConfig<First>, ...CreateTupleShape<Rest>]
  : [];

export type TupleShape = readonly ConfigNode[];

export type ConfigNode =
  | z.ZodType
  | CreateConfig_Object
  | CreateConfig_Array
  | CreateConfig_Tuple
  | CreateConfig_Union
  | undefined;

// ===== CONFIG RESOLVER =====
export type ResolveConfig<Config> = Config extends FunctionType
  ? Call<Config>
  : Config extends z.ZodType
  ? Config
  : Config extends (infer Configs)[]
  ? ResolveConfig<Configs>
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
