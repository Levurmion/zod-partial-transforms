import * as z from "zod/v4";
import * as core from "zod/v4/core";
import type { MapTypeToZodType } from "./zod-types";

export const createTypedStrictObject =
  <T extends core.$ZodLooseShape>() =>
  <
    Shape extends {
      [K in keyof T]: MapTypeToZodType<T[K]>;
    }
  >(
    shape: Shape
  ) => {
    return z.strictObject(shape);
  };

export const createTypedLooseObject =
  <T extends core.$ZodLooseShape>() =>
  <
    Shape extends Partial<{
      [K in keyof T]: MapTypeToZodType<T[K]>;
    }>
  >(
    shape: Shape
  ) => {
    return z.looseObject(shape) as z.ZodObject<
      Extract<Required<Shape>, core.$ZodShape>,
      { in: T; out: T }
    >;
  };

type T = {
  a: string;
  b: string;
  c: boolean;
  x: [1, 2];
  obj?: {
    d: string[];
    e: [null, undefined];
  };
};

type X = MapTypeToZodType<T>;

createTypedStrictObject<T>()({
  a: z.string(),
  b: z.string(),
  c: z.boolean(),
  x: z.tuple([z.literal(1), z.literal(2)]),
}).transform(({ a, b, c, x }) => {});

createTypedLooseObject<T>()({
  a: z.string(),
  b: z.string(),
  c: z.boolean(),
}).transform(({ a, b, c, ...rest }) => {});
