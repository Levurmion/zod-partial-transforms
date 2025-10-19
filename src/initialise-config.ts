import {
  createLooseObjectConstructor,
  createStrictObjectConstructor,
  type ConfigNode,
  type ConfigProductTypeOptions,
  type UnpackedConfigNode,
} from "./config-types";

export function initialiseConfig<Config extends ConfigNode>(
  config: Config
): UnpackedConfigNode {
  if (typeof config === "function") {
    const options = {
      strict: createStrictObjectConstructor(),
      loose: createLooseObjectConstructor(),
    } satisfies ConfigProductTypeOptions;

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
    return config;
  }
}
