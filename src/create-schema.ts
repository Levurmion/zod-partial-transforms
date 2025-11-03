import type {
  ArrayShape,
  ConfigNode,
  CreateConfig,
  ObjectShape,
  OriginalTypes,
} from "./config.types";
import * as z from "zod/v4";

const isZodType = (obj: object): obj is z.ZodType => {
  return "_zod" in obj;
};

const objectResolver = <Shape extends ObjectShape>(shape: Shape) => {
  // resolve object values
  return z.looseObject(shape) as any;
};

const arrayResolver = <Shape extends ArrayShape>(shape: Shape) => {
  return z.array(shape) as any;
};

const tupleResolver = <Shape extends ArrayShape>(shape: Shape) => {
  return z.tuple(shape) as any;
};

const resolverOptions = {
  object: objectResolver,
  array: arrayResolver,
  tuple: tupleResolver,
};

const resolveConfig = (config: ConfigNode) => {
  if (config === undefined) {
    return;
  } else if (isZodType(config)) {
    return config;
  } else {
    config(resolverOptions);
  }
};

export const createSchema = <O extends OriginalTypes>() => {
  return <SchemaConfig extends CreateConfig<O>>(config: SchemaConfig) => {
    if (isZodType(config)) {
      return config;
    } else if (typeof config === "function") {
    }
  };
};
