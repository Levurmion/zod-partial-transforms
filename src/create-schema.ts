import type {
  ArrayShape,
  BuilderFunctionOptions,
  ConfigNode,
  CreateConfig,
  ObjectShape,
  OriginalTypes,
  ResolveConfig,
  TupleShape,
} from "./config.types";
import * as z from "zod/v4";

const isZodType = (obj: object): obj is z.ZodType => {
  return "_zod" in obj;
};

const isTupleShape = <T>(arr: readonly T[]): arr is readonly [T, ...T[]] => {
  return arr.length > 0;
};

const objectResolver = <Shape extends ObjectShape>(config: Shape) => {
  const configEntries = Object.entries(config);
  const resolvedConfigEntries = configEntries.map(([k, node]) => [
    k,
    resolveConfig(node),
  ]);
  const shape = Object.fromEntries(resolvedConfigEntries);
  return z.looseObject(shape);
};

const arrayResolver = <Shape extends ConfigNode>(config: Shape) => {
  const shape = resolveConfig(config);
  return z.array(shape);
};

const tupleResolver = <Shape extends TupleShape>(config: Shape) => {
  const shape = [...config.map((node) => resolveConfig(node))] as const;
  if (!isTupleShape(shape)) {
    return z.tuple([]);
  }
  return z.tuple(shape);
};

const unionResolver = <Shape extends ArrayShape>(config: Shape) => {
  const shape = config.map((node) => resolveConfig(node));
  /**
   * At runtime, we allow extra union members to be passed through. We only
   * validate the declared union members and transform them accordingly.
   */
  return z.union(shape).or(z.unknown());
};

const resolverOptions = {
  object: objectResolver,
  array: arrayResolver,
  tuple: tupleResolver,
  union: unionResolver,
} as unknown as BuilderFunctionOptions;

const resolveConfig = <Config extends ConfigNode>(
  config: Config
): ResolveConfig<Config> => {
  if (config === undefined) {
    throw new Error("undefined values are not allowed");
  } else if (isZodType(config)) {
    return config as ResolveConfig<Config>;
  } else {
    return config(resolverOptions) as ResolveConfig<Config>;
  }
};

export const createSchema = <O extends OriginalTypes>() => {
  return <SchemaConfig extends CreateConfig<O>>(config: SchemaConfig) => {
    return resolveConfig(config);
  };
};
