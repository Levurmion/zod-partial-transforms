import * as z from "zod/v4";

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
  | BooleanTypes;

type ConfigNakedTypesMap =
  | [string, StringTypes]
  | [number, NumberTypes]
  | [undefined, UndefinedTypes]
  | [null, NullTypes]
  | [symbol, SymbolTypes]
  | [Date, DateTypes]
  | [boolean, BooleanTypes];

type OriginalNakedTypes = ConfigNakedTypesMap[0];

// ===== PRODUCT TYPES =====

type ObjectOriginal = { [k: string]: OriginalTypes };

// strict objects
type StrictObjectShape<Original extends ObjectOriginal> = {
  [K in keyof Original]: CreateConfig<Original>;
};

export function createStrictObjectConstructor<
  Original extends ObjectOriginal
>() {
  function strictObjectConstructor<Shape extends StrictObjectShape<Original>>(
    shape: Shape
  ) {
    type UnpackedShape = {
      [K in keyof Shape]: UnpackConfig<Shape[K]>;
    };

    class StrictObject {
      _zodParser: typeof z.strictObject;
      _original: Original;
      _unpackedShape: UnpackedShape;
      _shape: Shape;
      _type: "strict";

      constructor(shape: Shape) {
        this._zodParser = z.strictObject;
        this._original = {} as Original;
        this._unpackedShape = {} as UnpackedShape;
        this._shape = shape;
        this._type = "strict";
      }

      getZodType(
        recursiveInitialiser: <Config extends ConfigNode>(
          config: Config
        ) => UnpackedConfigNode
      ) {
        const unpackedShape: Record<string, UnpackedConfigNode> = {};
        for (const [key, node] of Object.entries(this._shape)) {
          unpackedShape[key] = recursiveInitialiser(node);
        }
        return this._zodParser(unpackedShape);
      }
    }

    return new StrictObject(shape);
  }

  return strictObjectConstructor;
}

type StrictObjectConstructorCreator = typeof createStrictObjectConstructor;
type StrictObjectConstructor = ReturnType<StrictObjectConstructorCreator>;

// loose objects
type LooseObjectShape<Original extends ObjectOriginal> = Partial<{
  [K in keyof Original]: CreateConfig<Original>;
}>;

export function createLooseObjectConstructor<
  Original extends ObjectOriginal
>() {
  function looseObjectConstructor<Shape extends LooseObjectShape<Original>>(
    shape: Shape
  ) {
    type UnpackedShape = {
      [K in keyof Shape]: UnpackConfig<Exclude<Shape[K], undefined>>;
    };
    class LooseObject {
      _zodParser: typeof z.looseObject;
      _original: Original;
      _unpackedShape: UnpackedShape;
      _shape: Shape;
      _type: "loose";

      constructor(shape: Shape) {
        this._zodParser = z.looseObject;
        this._original = {} as Original;
        this._unpackedShape = {} as UnpackedShape;
        this._shape = shape;
        this._type = "loose";
      }

      getZodType(
        recursiveInitialiser: <Config extends ConfigNode>(
          config: Config
        ) => UnpackedConfigNode
      ) {
        const unpackedShape: Record<string, UnpackedConfigNode> = {};
        for (const [key, node] of Object.entries(this._shape)) {
          if (node) {
            unpackedShape[key] = recursiveInitialiser(node);
          }
        }
        return this._zodParser(unpackedShape) as z.ZodObject<
          UnpackedShape,
          { in: Original; out: Original }
        >;
      }
    }

    return new LooseObject(shape);
  }

  return looseObjectConstructor;
}

type LooseObjectConstructorCreator = typeof createLooseObjectConstructor;
type LooseObjectConstructor = ReturnType<LooseObjectConstructorCreator>;

export type ConfigProductTypeOptions = {
  strict: StrictObjectConstructor;
  loose: LooseObjectConstructor;
};

type ConfigProductTypes = (
  options: ConfigProductTypeOptions
) => ReturnType<ConfigProductTypeOptions[keyof ConfigProductTypeOptions]>;

// ===== ALL TYPES =====

export type ConfigNode = ConfigNakedTypes | ConfigProductTypes;
export type OriginalTypes = OriginalNakedTypes | { [k: string]: OriginalTypes };
export type UnpackedConfigNode = ConfigNakedTypes | z.ZodObject;

// ===== CONFIG CREATOR GENERIC =====

type CreateConfig<Original> = ConfigNode;

// ===== CONFIG UNPACKER GENERIC =====

type UnpackConfig<Config extends ConfigNode> = UnpackedConfigNode;
