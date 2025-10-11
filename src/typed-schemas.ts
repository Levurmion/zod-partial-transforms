import * as z from "zod/v4";
import * as core from "zod/v4/core";
import type { RecursivelyMapObjectToZodType } from "./zod-types";

export const typedStrictObject = <T extends core.$ZodLooseShape>(
  shape: RecursivelyMapObjectToZodType<T>
) => {
  return z.strictObject(shape);
};

export const typedLooseObject = <T extends core.$ZodLooseShape>(
  shape: RecursivelyMapObjectToZodType<Partial<T>>
) => {
  return z.looseObject(shape as RecursivelyMapObjectToZodType<T>);
};

type T = {
  a: string;
  b: string;
  c: boolean;
  obj: {
    d: string[];
    e?: [null, undefined];
  };
};

type X = RecursivelyMapObjectToZodType<T>;

const schema: X = z.object({
  a: z.string(),
  b: z.string(),
  c: z.boolean(),
  obj: z.object({
    d: z.array(z.string()),
    e: z.tuple([z.null(), z.undefined()]).optional(),
  }),
});
