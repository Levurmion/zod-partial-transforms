import {
  createConfig,
  createLooseObjectConstructor,
  createStrictObjectConstructor,
  type ConfigProductTypeBuilder,
  type CreateConfig,
  type InferProductTypeOriginal,
  type UnpackConfig,
  type UnpackedConfigNode,
} from "./config-types";
import * as z from "zod/v4";

type Example = {
  a: {
    b: string;
    c: number;
    nested: {
      deep: boolean;
    };
  };
  d: string;
};

type ExampleConfig = CreateConfig<Example>;

const config = createConfig<Example>()(({ loose }) =>
  loose({
    a: ({ loose }) =>
      loose({
        c: z.number(),
        x: z.boolean(),
        nested: ({ strict }) =>
          strict({
            deep: z.boolean(),
          }),
      }),
  })
);

type Unpacked = UnpackConfig<
  typeof config
>["_unpackedShape"]["a"]["_unpackedShape"];

function isProductTypeConfig(
  config: unknown
): config is ConfigProductTypeBuilder {
  return typeof config === "function";
}

export function initialiseConfig<Config>(config: Config): UnpackConfig<Config> {
  if (isProductTypeConfig(config)) {
    type ConfigOriginal = InferProductTypeOriginal<Config>;

    const options = {
      strict: createStrictObjectConstructor<ConfigOriginal>(),
      loose: createLooseObjectConstructor<ConfigOriginal>(),
    };

    const productType = config(options);
    const productTypeShape = productType._shape;
    const unpackedProductTypeShape: Record<string, UnpackedConfigNode> = {};

    for (const [k, config] of Object.entries(productTypeShape)) {
      if (config) {
        unpackedProductTypeShape[k] = initialiseConfig(config);
      }
    }

    return unpackedProductTypeShape as UnpackConfig<Config>;
  } else {
    return config as UnpackConfig<Config>;
  }
}

const initialisedConfig = initialiseConfig(config);
