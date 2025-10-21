import type { IsLiteral, Merge } from "type-fest";
import type { FunctionType, IsObject } from "./types";
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

type BooleanTypes = z.ZodBoolean | z.ZodLiteral<true> | z.ZodLiteral<false>;

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

type GetConfigNakedType<Original> = Extract<
  ConfigNakedTypesMap,
  [Original, unknown]
>[1];

// ===== PRODUCT TYPES =====

export type ObjectOriginal = { [k: string]: OriginalTypes };
export type ObjectShape = Record<string, any>;

// strict objects
type StrictObjectShape<Original extends ObjectOriginal> = {
  [K in keyof Original]: CreateConfig<Original[K]>;
};

class StrictObject<Original extends ObjectOriginal, Shape extends ObjectShape> {
  _zodParser = z.strictObject;
  _original = {} as Original;
  _type: "strict" = "strict";
  _shape: Shape;
  _unpackedShape = {} as { [K in keyof Shape]: UnpackConfig<Shape[K]> };

  constructor(shape: Shape) {
    this._shape = shape;
  }
}

export function createStrictObjectConstructor<
  Original extends ObjectOriginal
>() {
  function strictObjectConstructor<Shape extends StrictObjectShape<Original>>(
    shape: Shape
  ) {
    return new StrictObject<Original, Shape>(shape);
  }

  return strictObjectConstructor;
}

type StrictObjectConstructorCreator = typeof createStrictObjectConstructor;
type StrictObjectConstructor = ReturnType<StrictObjectConstructorCreator>;
type CreateStrictObjectConstructor<Original extends ObjectOriginal> =
  ReturnType<typeof createStrictObjectConstructor<Original>>;

// loose objects
type LooseObjectShape<Original extends ObjectOriginal> = Partial<{
  [K in keyof Original]: CreateConfig<Original[K]>;
}>;

class LooseObject<Original extends ObjectOriginal, Shape extends ObjectShape> {
  _zodParser = z.looseObject;
  _original = {} as Original;
  _type: "loose" = "loose";
  _shape: Shape;
  _unpackedShape = {} as { [K in keyof Shape]: UnpackConfig<Shape[K]> };

  constructor(shape: Shape) {
    this._shape = shape;
  }
}

export function createLooseObjectConstructor<
  Original extends ObjectOriginal
>() {
  function looseObjectConstructor<Shape extends LooseObjectShape<Original>>(
    shape: Shape
  ) {
    return new LooseObject<Original, Shape>(shape);
  }

  return looseObjectConstructor;
}

type LooseObjectConstructorCreator = typeof createLooseObjectConstructor;
type LooseObjectConstructor = ReturnType<LooseObjectConstructorCreator>;
type CreateLooseObjectConstructor<Original extends ObjectOriginal> = ReturnType<
  typeof createLooseObjectConstructor<Original>
>;

export type ConfigProductType = {
  _type: string;
  _original: unknown;
  _shape: unknown;
};

export type ConfigProductTypeOptions = {
  strict: StrictObjectConstructor;
  loose: LooseObjectConstructor;
};

export type ConfigProductTypeBuilder = (
  options: ConfigProductTypeOptions
) => ReturnType<ConfigProductTypeOptions[keyof ConfigProductTypeOptions]>;

// ===== PRODUCT TYPE UTILITIES =====

export type InferProductTypeOriginal<ProductType> = Extract<
  ProductType,
  FunctionType
> extends infer T extends ConfigProductTypeBuilder
  ? ReturnType<T>["_original"]
  : never;

// ===== ALL TYPES =====

export type OriginalTypes = OriginalNakedTypes | { [k: string]: OriginalTypes };
export type ConfigNode = ConfigNakedTypes | ConfigProductTypeBuilder;
export type UnpackedConfigNode =
  | ConfigNakedTypes
  | StrictObject<ObjectOriginal, ObjectShape>
  | LooseObject<ObjectOriginal, ObjectShape>;

// ===== CONFIG CREATOR GENERIC =====

export type CreateConfig<Original> = IsLiteral<Original> extends true
  ? CreateConfig_Literal<Original>
  : IsObject<Original> extends true
  ? Original extends ObjectOriginal
    ? CreateConfig_Object<Original>
    : never
  : GetConfigNakedType<Original>;

type CreateConfig_Literal<Original> = z.ZodLiteral<
  Extract<Original, z.util.Literal>
>;

type CreateConfig_Object<Original extends ObjectOriginal> = (options: {
  strict: CreateStrictObjectConstructor<Original>;
  loose: CreateLooseObjectConstructor<Original>;
}) => ReturnType<
  | CreateStrictObjectConstructor<Original>
  | CreateLooseObjectConstructor<Original>
>;

export function createConfig<Original extends OriginalTypes>() {
  return function configCreator<Config extends CreateConfig<Original>>(
    config: Config
  ) {
    return config;
  };
}

// ===== CONFIG UNPACKER GENERIC =====

export type UnpackConfig<Config> = Config extends FunctionType
  ? UnpackConfig_ProductType<Config>
  : Extract<Config, ConfigNakedTypes>;

type UnpackConfig_ProductType<Config extends ConfigProductTypeBuilder> =
  ReturnType<Config>;
