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

// ===== PRODUCT TYPES =====
type ProductTypeTags = "strict" | "loose";

type ObjectTypeOriginalShape = Record<string, OriginalTypes>;
type ObjectTypeConfigShape = Record<string, ConfigNode>;
type ObjectTypeShape = Record<string, Node>;

interface ProductTypeConfigShape {
  configType: ProductTypeTags;
}

interface ProductTypeShape {
  type: ProductTypeTags;
}

// strict object
interface StrictObjectConfigShape<Shape extends ObjectTypeConfigShape>
  extends ProductTypeConfigShape {
  configType: "strict";
  shape: Shape;
}

interface StrictObjectShape<Shape extends ObjectTypeShape>
  extends ProductTypeShape {
  type: "strict";
  shape: Shape;
}

// loose object
interface LooseObjectConfigShape<Shape extends ObjectTypeConfigShape>
  extends ProductTypeConfigShape {
  configType: "loose";
  shape: Shape;
}

interface LooseObjectShape<Shape extends ObjectTypeShape>
  extends ProductTypeShape {
  type: "loose";
  shape: Shape;
}

// ===== PRODUCT TYPE CONSTRUCTORS =====

export function createStrictObjectConfigConstructor<O extends OriginalTypes>() {
  type ObjectPart = Extract<O, ObjectTypeOriginalShape>;
  return function strictObjectConfigConstructor<
    Shape extends { [K in keyof ObjectPart]: CreateConfig<ObjectPart[K]> }
  >(shape: Shape): StrictObjectConfigShape<Shape> {
    return {
      configType: "strict",
      shape,
    };
  };
}

type StrictObjectConfigConstructor<O extends OriginalTypes> = Call<
  typeof createStrictObjectConfigConstructor<O>
>;

export function createLooseObjectConfigConstructor<O extends OriginalTypes>() {
  type ObjectPart = Extract<O, ObjectTypeOriginalShape>;
  return function looseObjectConfigConstructor<
    Shape extends Partial<{
      [K in keyof ObjectPart]: CreateConfig<ObjectPart[K]>;
    }>
  >(shape: Shape): LooseObjectConfigShape<Shape> {
    return {
      configType: "loose",
      shape,
    };
  };
}

type LooseObjectConfigConstructor<O extends OriginalTypes> = Call<
  typeof createLooseObjectConfigConstructor<O>
>;

// ===== PRODUCT TYPE UNIONS =====
type ProductTypeConfigOptions = {
  strict: StrictObjectConfigConstructor<OriginalTypes>;
  loose: LooseObjectConfigConstructor<OriginalTypes>;
};

type ProductTypeConfigBuilder = (
  options: ProductTypeConfigOptions
) => Call<ProductTypeConfigOptions[keyof ProductTypeConfigOptions]>;

type ProductTypeNodes =
  | StrictObjectShape<ObjectTypeShape>
  | LooseObjectShape<ObjectTypeShape>;

// ===== ALL TYPES =====

// permitted types that can be mapped to Zod types and builders
export type OriginalTypes = OriginalNakedTypes | { [k: string]: OriginalTypes };

// emitted configuration nodes with respect to the passed OriginalTypes
export type ConfigNode =
  | ConfigNakedTypes
  | ProductTypeConfigBuilder
  | undefined;

// Nodes after all builders have been called and resolved
export type Node = ConfigNakedTypes | ProductTypeNodes;

// ===== CONFIG CREATOR GENERIC =====

export type CreateConfig<O extends OriginalTypes> = IsLiteral<O> extends true
  ? CreateConfig_Literal<O>
  : IsObject<O> extends true
  ? O extends ObjectTypeOriginalShape
    ? CreateConfig_Object<O>
    : never
  : GetConfigNakedType<O>;

type CreateConfig_Literal<O> = z.ZodLiteral<Extract<O, z.util.Literal>>;

type CreateConfig_Object<O extends ObjectTypeOriginalShape> = (options: {
  strict: StrictObjectConfigConstructor<O>;
  loose: LooseObjectConfigConstructor<O>;
}) => Call<StrictObjectConfigConstructor<O> | LooseObjectConfigConstructor<O>>;

export function createConfig<O extends OriginalTypes>() {
  return function configCreator<Config extends CreateConfig<O>>(
    config: Config
  ) {
    return config;
  };
}

type Example = {
  a: {
    b: string;
    c: number;
    nested: {
      deep: boolean;
    };
  };
  d: string;
};

const config = createConfig<Example>()(({ loose }) =>
  loose({
    a: ({ strict }) =>
      strict({
        b: z.string(),
        c: z.number(),
        nested: ({ loose }) => loose({}),
      }),
  })
);
