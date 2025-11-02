import type { IsLiteral, IsTuple, Merge } from "type-fest";
import type { Call, FunctionType, IsObject } from "./types";
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

type ConfigNakedTypes =
  | StringTypes
  | NumberTypes
  | UndefinedTypes
  | NullTypes
  | SymbolTypes
  | DateTypes
  | BooleanTypes
  | z.ZodLiteral;

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

export type ConfigNode = ConfigNakedTypes | undefined;

// Nodes after all builders have been called and resolved
export type Node = ConfigNakedTypes;

// ===== CONFIG CREATOR GENERIC =====

export type CreateConfig<O extends OriginalTypes> = IsLiteral<O> extends true
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

type CreateConfig_Literal<O> = z.ZodLiteral<Extract<O, z.util.Literal>>;

type CreateConfig_Object<O extends OriginalObjectType = OriginalObjectType> = (
  object: <Shape extends { [K in keyof O]?: CreateConfig<O[K]> }>(
    config: Shape
  ) => ResolveObjectConfig<Shape, O>
) => z.ZodType;

type CreateConfig_Array<O extends OriginalArrayType> = (
  array: <Shape extends CreateConfig<O[number]>[]>(
    config: Shape
  ) => ResolveArrayConfig<Shape>
) => z.ZodType;

type CreateConfig_Tuple<O extends OriginalArrayType> = (
  tuple: <Shape extends CreateTupleShape<O>>(
    config: Shape
  ) => ResolveTupleConfig<Shape>
) => z.ZodType;

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

type MergeObjectIO<
  Original,
  Shape extends core.$ZodLooseShape,
  Mode extends "input" | "output"
> = (
  Mode extends "input"
    ? z.input<z.ZodObject<Shape>>
    : z.output<z.ZodObject<Shape>>
) extends infer IO
  ? Merge<Original, IO>
  : never;

type ResolveArrayConfig<Config extends unknown[]> = ResolveConfig<
  Config[number]
> extends infer ResolvedElements extends core.SomeType
  ? z.ZodArray<ResolvedElements>
  : never;

type ResolveTupleConfig<Config extends unknown[]> =
  ResolveTupleConfig_Rec<Config> extends infer ResolvedElements extends z.util.TupleItems
    ? z.ZodTuple<ResolvedElements>
    : never;

type ResolveTupleConfig_Rec<Config extends unknown[]> = Config extends [
  infer First,
  ...infer Rest
]
  ? [ResolveConfig<First>, ...ResolveTupleConfig_Rec<Rest>]
  : [];

const createSchema =
  <T extends OriginalTypes>() =>
  <Config extends CreateConfig<T>>(config: Config) =>
    config as ResolveConfig<Config>;

type Example = {
  a: {
    aa: string;
    ab: boolean;
    ac: {
      aca: "literal";
    };
  };
  b: number;
  arr: { a: null; b: { nested: string } }[];
  tup: [number, boolean, { prop: number }];
};

const schema = createSchema<Example>()((object) =>
  object({
    a: (object) =>
      object({
        aa: z.string().transform((v) => parseInt(v)),
        ab: z.boolean().transform(() => 1),
      }),
    arr: (array) =>
      array([
        (object) =>
          object({
            a: z.null(),
            b: (object) => object({ nested: z.string() }),
          }),
      ]),
    tup: (tuple) =>
      tuple([
        z.number(),
        z.boolean(),
        (object) => object({ prop: z.number() }),
      ]),
  })
);
