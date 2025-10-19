import {
  createConfig,
  createLooseObjectConstructor,
  createStrictObjectConstructor,
  type ConfigNode,
  type ConfigProductTypeOptions,
  type ConfigProductTypes,
  type CreateConfig,
  type UnpackConfig,
  type UnpackedConfigNode,
} from "./config-types";
import * as z from "zod/v4";

type Example = {
  a: {
    b: string;
    c: number;
  };
  d: string;
};

type ExampleConfig = CreateConfig<Example>;

const config = createConfig<Example>()(({ loose }) =>
  loose({ a: ({ loose }) => loose({}) })
);

type UnpackedExampleConfig = UnpackConfig<
  typeof config
>["_zod"]["def"]["shape"];

const simpleConfig = createConfig<boolean>()(z.boolean());

function isProductTypeConfig(config: unknown): config is ConfigProductTypes {
  return typeof config === "function";
}

export function initialiseConfig<Config>(config: Config): UnpackedConfigNode {
  if (isProductTypeConfig(config)) {
    type ConfigOriginal = ReturnType<
      Extract<Config, (...args: any[]) => any>
    >["_original"];

    const options = {
      strict: createStrictObjectConstructor<ConfigOriginal>(),
      loose: createLooseObjectConstructor<ConfigOriginal>(),
    };

    const productType = config(options);

    switch (productType._type) {
      case "strict": {
        return productType.getZodType(initialiseConfig);
      }
      case "loose": {
        return productType.getZodType(initialiseConfig);
      }
    }
  } else {
    return config as UnpackedConfigNode;
  }
}

const initialisedConfig = initialiseConfig(config);
