import {
  __productType,
  createConfig,
  createLooseObjectConstructor,
  createStrictObjectConstructor,
  LooseObject,
  StrictObject,
  type ConfigProductTypeBuilder,
  type CreateConfig,
  type DeriveZodType,
  type InferProductTypeOriginal,
  type ProductTypeNode,
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

/**
 * If we encounter a function, we can only assume now that this is probably a builder
 * function. As to whether it is a valid `ConfigProductTypeBuilder`, we have to still
 * nominally introspect the return type after calling it.
 */
function isMaybeProductTypeConfigNode(
  config: unknown
): config is ConfigProductTypeBuilder {
  return typeof config === "function";
}

const ALLOWED_BUILDER_RETURNS = ["StrictObject", "LooseObject"];

export function initialiseConfig<Config>(config: Config): UnpackConfig<Config> {
  if (isMaybeProductTypeConfigNode(config)) {
    type ConfigOriginal = InferProductTypeOriginal<Config>;

    const options = {
      strict: createStrictObjectConstructor<ConfigOriginal>(),
      loose: createLooseObjectConstructor<ConfigOriginal>(),
    };

    const productType = config(options);
    if (!(__productType in productType)) {
      throw new Error(
        `Builder callbacks can only return: ${ALLOWED_BUILDER_RETURNS.join(
          ","
        )}`
      );
    }

    const productTypeShape = productType._shape;
    const unpackedProductTypeShape: Record<string, UnpackedConfigNode> = {};

    for (const [k, config] of Object.entries(productTypeShape)) {
      if (config) {
        unpackedProductTypeShape[k] = initialiseConfig(config);
      }
    }

    return productType.constructor(
      unpackedProductTypeShape
    ) as UnpackConfig<Config>;
  } else {
    return config as UnpackConfig<Config>;
  }
}

const isProductTypeNode = (node: unknown): node is ProductTypeNode => {
  return node instanceof StrictObject || node instanceof LooseObject;
};

export function deriveZodType<UnpackedConfig>(
  unpackedConfig: UnpackedConfig
): DeriveZodType<UnpackedConfig> {
  if (isProductTypeNode(unpackedConfig)) {
    const nodeShape = unpackedConfig._shape;

    const derivedNodeShape: Record<string, z.ZodType> = {};
    for (const [k, node] of Object.entries(nodeShape)) {
      derivedNodeShape[k] = deriveZodType(node);
    }

    return unpackedConfig._zodParser(
      nodeShape
    ) as DeriveZodType<UnpackedConfig>;
  } else {
    return unpackedConfig as DeriveZodType<UnpackedConfig>;
  }
}

const initialisedConfig = initialiseConfig(config);
const derivedConfig = deriveZodType(initialisedConfig).transform(
  ({ a, ...rest }) => {}
);
