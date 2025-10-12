import * as z from "zod/v4";
import * as core from "zod/v4/core";
import type { MapTypeToZodType } from "./map-type-to-zod-type";
import type { Merge } from "type-fest";

export type TypedStrictObject<T extends core.$ZodLooseShape> = <
  Shape extends {
    [K in keyof T]: MapTypeToZodType<T[K]>;
  }
>(
  shape: Shape
) => z.ZodObject<Shape, core.$strict>;

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

export type TypedLooseObject<T extends core.$ZodLooseShape> = <
  Shape extends Partial<{
    [K in keyof T]: MapTypeToZodType<T[K]>;
  }>
>(
  shape: Shape
) => z.ZodObject<
  Extract<Shape, core.$ZodShape>,
  {
    in: T;
    out: Merge<T, z.output<z.ZodObject<Extract<Shape, core.$ZodShape>>>>;
  }
>;

export const createTypedLooseObject =
  <T extends core.$ZodLooseShape>() =>
  <
    Shape extends Partial<{
      [K in keyof T]: MapTypeToZodType<T[K]>;
    }>
  >(
    shape: Shape
  ) => {
    type ShapeType = z.ZodObject<Extract<Shape, core.$ZodShape>>;
    return z.looseObject(shape) as z.ZodObject<
      Extract<Shape, core.$ZodShape>,
      { in: T; out: Merge<T, z.output<ShapeType>> }
    >;
  };
