import * as z from "zod/v4";
import type { Call, FunctionType } from "./types";

declare const CONFIG: unique symbol;

type ObjectConfig = { [CONFIG]: true };

const isObjectConfig = (config: unknown): config is ObjectConfig => {
  if (typeof config === "object" && config !== null && CONFIG in config) {
    return config[CONFIG] === true;
  }
  return false;
};

const typedEntries = <O extends object>(obj: O) => {
  return Object.entries(obj) as [keyof O, O[keyof O]][];
};

const typedFromEntries = <K extends PropertyKey, V>(entries: [K, V][]) => {
  return Object.fromEntries(entries) as Record<K, V>;
};

const stripConfigSymbol = <O extends ObjectConfig>(obj: O) => {
  const objEntries = typedEntries(obj).filter(([k, _]) => k !== CONFIG);
  return typedFromEntries(objEntries) as unknown as Omit<O, typeof CONFIG>;
};

type CompiledConfig<Config extends Configuration> = Config extends FunctionType
  ? Call<Config>
  : Config extends ObjectConfig
  ? z.ZodObject<Extract<Omit<Config, typeof CONFIG>, z.ZodRawShape>>
  : Config;

type Compiler = <Config extends Configuration>(
  config: Config
) => CompiledConfig<Config>;

type CustomCompilation = (compiler: Compiler) => any;

type Configuration = z.ZodType | CustomCompilation | ObjectConfig;

const compile = <Config extends Configuration>(
  config: Config
): CompiledConfig<Config> => {
  if (typeof config === "function") {
    const resolvedConfig = config(compile);
    return resolvedConfig;
  } else if (isObjectConfig(config)) {
    const strippedObject = stripConfigSymbol(config);
    return z.object(strippedObject) as CompiledConfig<Config>;
  }
  return config as CompiledConfig<Config>;
};

const zs = compile({ [CONFIG]: true, a: z.string() });
