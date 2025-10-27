import type { IsLiteral, Merge } from "type-fest";
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

type NullTypes = z.ZodUndefined;

type SymbolTypes = z.ZodSymbol;

type DateTypes = z.ZodDate;

type BooleanTypes = z.ZodBoolean;

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

type GetConfigNakedType<O> = Extract<ConfigNakedTypesMap, [O, unknown]>[1];

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

// ===== CONFIG COMPILER GENERIC =====

export type CreateCompilerConfig<O extends OriginalTypes> =
  IsLiteral<O> extends true
    ? CreateCompilerConfig_Literal<O>
    : O extends OriginalObjectType
    ? CreateCompilerConfig_Object<O>
    : O extends boolean
    ? z.ZodBoolean
    : GetConfigNakedType<O>;

type CreateCompilerConfig_Literal<O> = z.ZodLiteral<Extract<O, z.util.Literal>>;

type CreateCompilerConfig_Object<
  O extends OriginalObjectType = OriginalObjectType,
  ExpectedShape extends {
    [K in keyof O]?: CreateCompilerConfig<O[K]>;
  } = { [K in keyof O]?: CreateCompilerConfig<O[K]> }
> = (
  compiler: <Shape extends ExpectedShape>(
    config: Shape
  ) => CompileObjectConfig<Shape, O>
) => CompileObjectConfig<
  {
    [K in keyof O]?: CreateCompilerConfig<O[K]> extends FunctionType
      ? Call<CreateCompilerConfig<O[K]>>
      : Extract<CreateCompilerConfig<O[K]>, z.ZodType>;
  },
  O
>;

// ===== CONFIG COMPILER =====
type CompileObjectConfig<
  Config,
  Original extends OriginalObjectType
> = IsObject<Config> extends true
  ? {
      [K in keyof Config]: Exclude<Config[K], undefined> extends infer Value
        ? Value extends z.ZodType
          ? Config[K]
          : Config[K] extends FunctionType
          ? Call<Config[K]>
          : never
        : never;
    } extends infer CompiledShape extends core.$ZodLooseShape
    ? z.ZodObject<
        CompiledShape,
        {
          in: MergeObjectIO<Original, CompiledShape>;
          out: MergeObjectIO<Original, CompiledShape>;
        }
      >
    : never
  : never;

type MergeObjectIO<Original, Shape extends core.$ZodLooseShape> = z.input<
  z.ZodObject<Shape>
> extends infer ShapeInput
  ? Merge<Original, ShapeInput>
  : never;

type Example = {
  a: {
    aa: string;
    ab: boolean;
    ac: {
      aca: "literal";
    };
  };
  b: number;
};

const createSchema =
  <T extends OriginalTypes>() =>
  <Config extends CreateCompilerConfig<T>>(config: Config) =>
    config as Config extends FunctionType ? Call<Config> : Config;

const schema = createSchema<Example>()((compile) =>
  compile({
    a: (compile) =>
      compile({
        aa: z.string(),
        ac: (compile) =>
          compile({
            aca: z.literal("literal"),
          }),
      }),
  })
);
