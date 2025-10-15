import type { IsLiteral, IsTuple } from "type-fest";
import * as core from "zod/v4/core";
import * as z from "zod/v4";
import type { IsObject } from "./types";
import type { GetZodType } from "./zod-types";

// NESTED TYPES
declare const __strict: unique symbol;
declare const __loose: unique symbol;

type StrictBrand = { [__strict]: "strict" };
type LooseBrand = { [__loose]: "loose" };

type TypedStrictObject<T> = <
  Shape extends {
    [K in keyof T]: CreateSchemaConfig<T[K]>;
  }
>(
  shape: Shape
) => z.ZodObject<Extract<Shape, core.$ZodLooseShape>> & StrictBrand;

type TypedLooseObject<T extends Record<string, unknown>> = <
  Shape extends Partial<{
    [K in keyof T]: CreateSchemaConfig<T[K]>;
  }>
>(
  shape: Shape
) => z.ZodObject<Extract<Shape, core.$ZodLooseShape>, { in: T; out: T }> &
  LooseBrand;

type TypedObjectConstructor<T extends Record<string, unknown>> =
  | {
      type: "loose";
      schema: (loose: TypedLooseObject<T>) => ReturnType<TypedLooseObject<T>>;
    }
  | {
      type: "strict";
      schema: (
        strict: TypedStrictObject<T>
      ) => ReturnType<TypedStrictObject<T>>;
    };

export type CreateSchemaConfig<T> = IsLiteral<T> extends true
  ? z.ZodLiteral<Extract<T, core.util.Literal>>
  : T extends object
  ? IsObject<T> extends true
    ? TypedObjectConstructor<Extract<T, Record<string, unknown>>>
    : T extends unknown[]
    ? IsTuple<T> extends true
      ? []
      : []
    : z.ZodNever
  : GetZodType<T>;

type InferSchemaConfigZodType_Object<Config> = Config extends {
  schema: infer Fn extends (...args: any[]) => any;
}
  ? ReturnType<Fn> extends infer Object extends z.ZodObject
    ? Object["_zod"]["def"]["shape"] extends infer Shape extends Record<
        string,
        unknown
      >
      ? z.ZodObject<{
          [K in keyof Shape]: InferSchemaConfigZodType<Shape[K]>;
        }>
      : never
    : never
  : never;

export type InferSchemaConfigZodType<Config> = Extract<
  Config extends { type: "loose" } | { type: "strict" }
    ? InferSchemaConfigZodType_Object<Config>
    : Config,
  z.ZodType
>;

type Example = {
  a: {
    b: string;
    c: number;
  };
  d: boolean;
};

const createSchemaConfig =
  <T>() =>
  <Config extends CreateSchemaConfig<T>>(config: Config) =>
    config;

const config = createSchemaConfig<Example>()({
  type: "loose",
  schema: (loose) =>
    loose({
      a: {
        type: "strict",
        schema: (strict) =>
          strict({
            b: z.string(),
            c: z.number(),
            d: z.boolean(),
          }),
      },
    }),
});

type InferredSchema = z.output<InferSchemaConfigZodType<typeof config>>;
