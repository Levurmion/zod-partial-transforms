import type { Merge } from "type-fest";
import * as z from "zod/v4";
import * as core from "zod/v4/core";

export type IsObject<T> = T extends object
  ? T extends unknown[]
    ? false
    : true
  : false;

export type PickLikeValue<T, V> = IsObject<T> extends true
  ? { [K in keyof T as V extends T[K] ? K : never]: T[K] }
  : never;

export type FunctionType = (...args: any[]) => any;

export type Call<Fn extends FunctionType> = ReturnType<Fn>;

export type MergeObjectIO<
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
