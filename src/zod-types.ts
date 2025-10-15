import * as z from "zod/v4";
import type { PickLikeValue } from "./types";
import type { ValueOf } from "type-fest";

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

export type GetZodType<T> = Extract<
  ValueOf<Pick<ZodDataTypes, keyof PickLikeValue<DataTypes, T>>>,
  z.ZodType
>;
