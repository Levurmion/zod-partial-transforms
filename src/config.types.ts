import type { IsLiteral, IsTuple, IsUnion, Merge } from "type-fest";
import type {
  Call,
  FunctionType,
  IsObject,
  MergeBuilderFunctions,
  MergeObjectIO,
} from "./types";
import * as z from "zod/v4";
import * as core from "zod/v4/core";

// ===== NAKED TYPES =====

type GetConfigNakedType<O> =
  | z.ZodType<unknown, O>
  | TypedZodPipe<z.ZodType<unknown, O>>;

type TypedZodPipe<InputSchema extends z.ZodType> = z.ZodPipe<
  InputSchema,
  core.SomeType
>;

type OriginalNakedTypes =
  | string
  | number
  | undefined
  | null
  | symbol
  | Date
  | boolean
  | bigint;

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

export type BuilderFunctions = MergeBuilderFunctions<
  | CreateConfig_Object
  | CreateConfig_Array
  | CreateConfig_Tuple
  | CreateConfig_Union
>;
export type BuilderFunctionOptions = Parameters<BuilderFunctions>[0];
export type ConfigNode = z.ZodType | undefined | BuilderFunctions;

// ===== CONFIG CREATOR GENERIC =====

export type CreateConfig<O extends OriginalTypes> = [
  CreateConfig_Singleton<O>,
  CreateConfig_Union<O>
] extends [infer Single extends ConfigNode, infer Union extends ConfigNode]
  ?
      | Exclude<Single | Union, FunctionType>
      | MergeBuilderFunctions<Extract<Single | Union, FunctionType>>
  : never;

type CreateConfig_Singleton<O extends OriginalTypes> = IsLiteral<O> extends true
  ? CreateConfig_Literal<O>
  : O extends boolean
  ? GetConfigNakedType<boolean>
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
        ) => ResolveUnionConfig<Shape, O>;
      }) => z.ZodType
    : never;

export type CreateUnionShape<O extends OriginalTypes> = (
  | Exclude<HandleUnionMembers<O>, FunctionType>
  | MergeBuilderFunctions<Extract<HandleUnionMembers<O>, FunctionType>>
  | HandleBooleanInUnion<O>
)[];

type HandleUnionMembers<O extends OriginalTypes> = O extends unknown
  ? // distribute O to be interrogated per-union member
    CreateConfig_Singleton<O>
  : never;

type HandleBooleanInUnion<O extends OriginalTypes> = [boolean] extends [O]
  ? GetConfigNakedType<boolean>
  : never;

type CreateConfig_Literal<O> = z.ZodLiteral<Extract<O, z.util.Literal>>;

type CreateConfig_Object<O extends OriginalObjectType = OriginalObjectType> =
  (opt: {
    object: <Shape extends CreateObjectShape<O>>(
      config: Shape
    ) => ResolveObjectConfig<Shape, O>;
  }) => z.ZodType<unknown, O>;

export type CreateObjectShape<O extends OriginalObjectType> = {
  [K in keyof O]?: CreateConfig<O[K]>;
};

export type ObjectShape = { [key: string]: ConfigNode };

type CreateConfig_Array<O extends OriginalArrayType = OriginalArrayType> =
  (opt: {
    array: <Shape extends CreateArrayShape<O>>(
      config: Shape
    ) => ResolveArrayConfig<Shape>;
  }) => z.ZodType<unknown, O>;

export type CreateArrayShape<O extends OriginalArrayType = OriginalArrayType> =
  CreateConfig<O[number]>;

export type ArrayShape = ConfigNode[];

type CreateConfig_Tuple<O extends OriginalTupleType = OriginalTupleType> =
  (opt: {
    tuple: <Shape extends CreateTupleShape<O>>(
      config: Shape
    ) => ResolveTupleConfig<Shape>;
  }) => z.ZodType<unknown, O>;

export type CreateTupleShape<O extends OriginalTupleType> = O extends [
  infer First extends OriginalTypes,
  ...infer Rest extends OriginalArrayType
]
  ? [CreateConfig<First>, ...CreateTupleShape<Rest>]
  : [];

export type TupleShape = readonly ConfigNode[];

// ===== CONFIG RESOLVERS =====
export type ResolveConfig<Config> = Config extends FunctionType
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
      [K in keyof Config]: ResolveConfig<Exclude<Config[K], undefined>>;
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

type ResolveUnionConfig<
  Config extends unknown[],
  Original extends OriginalTypes
> = ResolveConfig<
  Config[number]
> extends infer ResolvedElements extends core.SomeType
  ? z.ZodUnion<ResolvedElements[]> extends infer ZU extends z.ZodUnion
    ? // we aim to directly modify the union's inferred input/output, merging them with Original
      Merge<
        ZU,
        {
          _zod: Merge<
            ZU["_zod"],
            {
              // the input must be asserted as the Original type
              input: z.input<ZU> | Original;
              /**
               * the output asserted as:
               *
               * output of declared members + (Original types - input of declared members)
               *
               * This correctly represents any transformations that occur on declared
               * union members.
               */
              output: z.output<ZU> | Exclude<Original, z.input<ZU>>;
            }
          >;
        }
      >
    : never
  : never;

type ResolveArrayConfig<Config extends unknown> = z.ZodArray<
  ResolveConfig<Config>
>;

type ResolveTupleConfig<Config extends readonly unknown[]> =
  ResolveTupleConfig_Rec<Config> extends infer ResolvedElements extends z.util.TupleItems
    ? z.ZodTuple<ResolvedElements, null>
    : never;

type ResolveTupleConfig_Rec<Config extends readonly unknown[]> =
  Config extends [infer First, ...infer Rest]
    ? [ResolveConfig<First>, ...ResolveTupleConfig_Rec<Rest>]
    : [];
