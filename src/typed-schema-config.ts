import * as core from "zod/v4/core";
import * as z from "zod/v4";
import type { IsArray, IsObject, PickLikeValue } from "./types";
import type { IsLiteral, IsTuple, Merge, ValueOf } from "type-fest";

////////// UTILITY TYPES //////////

type ZodStringTypes =
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

type ZodNumberTypes =
  | z.ZodNumber
  | z.ZodNumberFormat
  | z.ZodBigInt
  | z.ZodBigIntFormat;

type ZodUndefinedTypes = z.ZodUndefined;

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
  null: z.ZodNull;
  boolean: z.ZodBoolean;
  symbol: z.ZodSymbol;
  date: z.ZodDate;
  object: z.ZodObject;
  array: z.ZodArray;
  tuple: z.ZodTuple;
  never: z.ZodNever;
};

type GetZodType<T> = Extract<
  ValueOf<Pick<ZodDataTypes, keyof PickLikeValue<DataTypes, T>>>,
  z.ZodType
>;

////////// TYPED OBJECTS //////////

type StrictObject<ActualShape extends core.$ZodLooseShape> =
  z.ZodObject<ActualShape>;

export type TypedStrictObject<T extends core.$ZodLooseShape> = <
  Shape extends {
    [K in keyof T]: MapTypeToSchemaConfig<T[K]>;
  }
>(
  shape: Shape
) => StrictObject<Shape>;

type LooseMergedObject<
  T extends core.$ZodLooseShape,
  ActualShape
> = z.ZodObject<
  ActualShape,
  {
    in: T;
    out: T;
  }
>;

export type TypedLooseObject<T extends core.$ZodLooseShape> = <
  Shape extends Partial<{
    [K in keyof T]: MapTypeToSchemaConfig<T[K]>;
  }>
>(
  shape: Shape
) => LooseMergedObject<T, Shape>;

type TypedObject<T extends core.$ZodLooseShape> =
  | {
      type: "strict";
      builder: (t: TypedStrictObject<T>) => ReturnType<TypedStrictObject<T>>;
    }
  | {
      type: "loose";
      builder: (t: TypedLooseObject<T>) => ReturnType<TypedLooseObject<T>>;
    };

type Example = {
  a: {
    b: string;
    c: boolean;
    nested: {
      field: true;
      other: false;
    };
  };
  d: number;
};

type MapTypeToSchemaConfig<T> = IsLiteral<T> extends true
  ? z.ZodLiteral<Extract<T, core.util.Literal>>
  : T extends object
  ? IsObject<T> extends true
    ? TypedObject<T>
    : T extends unknown[]
    ? IsTuple<T> extends true
      ? []
      : []
    : z.ZodNever
  : GetZodType<T>;

type X = MapTypeToSchemaConfig<Example>;

const x: X = {
  type: "loose",
  builder: (t) =>
    t({
      a: {
        type: "loose",
        builder: (t) => t({}),
      },
    }),
};

type XX = (typeof x)["builder"] extends infer Fn ? Fn : never;

type XXX = z.input<ReturnType<XX>>;
