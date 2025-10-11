import type * as core from "zod/v4/core";
import * as z from "zod";
import type { IsArray, IsObject, IsTuple } from "./types";

type X = core.$ZodBoolean["_zod"]["output"];

type GetZodType<T> = Extract<
  core.$ZodTypes,
  { _zod: { output: T } } | { _zod: { input: T } }
>;

type MapSchemaBuilderTuple<
  T extends unknown[],
  Acc extends unknown[] = []
> = T extends [infer First, ...infer Rest]
  ? MapSchemaBuilderTuple<Rest, [...Acc, TypedSchemaBuilder<First>]>
  : Acc;

type TypedSchemaBuilder<T> = IsObject<T> extends true
  ? { [K in keyof T]: TypedSchemaBuilder<T[K]> }
  : T extends unknown[]
  ? IsTuple<T> extends true
    ? MapSchemaBuilderTuple<T>
    : IsArray<T> extends true
    ? core.$ZodArray<Extract<TypedSchemaBuilder<T[number]>, core.$ZodType>>
    : GetZodType<T>
  : GetZodType<T>;

type Object = {
  a: {
    b: string;
    c: [number, boolean];
    d: string;
  };
  e: number[];
};

type SchemaBuilder = TypedSchemaBuilder<Object>;

const Builder: SchemaBuilder = {
  a: {
    b: z.string(),
    c: [z.number(), z.boolean()],
    d: () => "",
  },
};
