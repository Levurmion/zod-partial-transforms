import type { CreateConfig, OriginalTypes } from "./config.types";

export const createSchema = <O extends OriginalTypes>() => {
  return <SchemaConfig extends CreateConfig<O>>(config: SchemaConfig) => config;
};
