import { describe, expect, expectTypeOf, it } from "vitest";
import { createSchema } from "./create-schema";
import * as z from "zod/v4";

describe("Naked Types", () => {
  it("string", () => {
    const schema = createSchema<string>()(z.string());
    expect(schema.parse("string")).toEqual("string");
  });

  it("number", () => {
    const schema = createSchema<number>()(z.number());
    expect(schema.parse(100)).toEqual(100);
  });

  it("boolean", () => {
    const schema = createSchema<boolean>()(({ union }) => union([z.boolean()]));
    expect(schema.parse(true)).toEqual(true);
    expect(schema.parse(false)).toEqual(false);
  });

  it("symbol", () => {
    const schema = createSchema<symbol>()(z.symbol());
    const symbol = Symbol("sym");
    expect(schema.parse(symbol)).toEqual(symbol);
  });

  it("null", () => {
    const schema = createSchema<null>()(z.null());
    expect(schema.parse(null)).toEqual(null);
  });

  it("undefined", () => {
    const schema = createSchema<undefined>()(z.undefined());
    expect(schema.parse(undefined)).toEqual(undefined);
  });

  it.each(["string", "This is a sentence.", "type"] as const)(
    "string literals",
    (v) => {
      const schema = createSchema<typeof v>()(z.literal(v));
      expect(schema.parse(v)).toEqual(v);
    }
  );

  it.each([1, 1.2, 100] as const)("numeric literals", (v) => {
    const schema = createSchema<typeof v>()(z.literal(v));
    expect(schema.parse(v)).toEqual(v);
  });

  it("boolean literals", () => {
    const trueSchema = createSchema<true>()(z.literal(true));
    expect(trueSchema.parse(true)).toEqual(true);

    const falseSchema = createSchema<false>()(z.literal(false));
    expect(falseSchema.parse(false)).toEqual(false);
  });
});

describe("Product Types", () => {
  it("simple object", () => {
    type Object = {
      string: string;
      number: number;
      boolean: boolean;
      null: null;
      undefined: undefined;
      symbol: symbol;
    };

    const schema = createSchema<Object>()(({ object }) =>
      object({
        string: z.string(),
        number: z.number(),
        boolean: z.boolean(),
        null: z.null(),
        undefined: z.undefined(),
        symbol: z.symbol(),
      })
    );

    const object: Object = {
      string: "string",
      number: 123,
      boolean: true,
      null: null,
      undefined: undefined,
      symbol: Symbol("sym"),
    };

    expect(schema.parse(object)).toEqual(object);
  });

  it("simple array", () => {
    type Array = (string | number | boolean | null)[];

    const schema = createSchema<Array>()(({ array }) =>
      array(({ union }) =>
        union([z.string(), z.number(), z.boolean(), z.null()])
      )
    );

    const array: Array = [null, false, 123, "string"];
    expect(schema.parse(array)).toEqual(array);
  });

  it("empty array/tuple", () => {
    type EmptyArray = [];

    const schema = createSchema<EmptyArray>()(({ tuple }) => tuple([]));
    expect(schema.parse([])).toEqual([]);
    expect(() => schema.parse([1])).toThrowError();
  });

  it("simple tuple", () => {
    type Tuple = [string, number, boolean, null];

    const schema = createSchema<Tuple>()(({ tuple }) =>
      tuple([z.string(), z.number(), z.boolean(), z.null()])
    );

    const correctTuple: Tuple = ["string", 123, false, null];
    const wrongTuple = [null, false, 123, "string"];

    expect(schema.parse(correctTuple)).toEqual(correctTuple);
    expect(() => schema.parse(wrongTuple)).toThrowError();
  });

  it("nested object", () => {
    type NestedObject = {
      a: string;
      b: number;
      nested: {
        c: boolean;
      };
    };

    const schema = createSchema<NestedObject>()(({ object }) =>
      object({
        a: z.string(),
        b: z.number(),
        nested: ({ object }) => object({ c: z.boolean() }),
      })
    );

    const nestedObject: NestedObject = {
      a: "string",
      b: 123,
      nested: {
        c: true,
      },
    };

    expect(schema.parse(nestedObject)).toEqual(nestedObject);
  });

  it("nested array", () => {
    type NestedArray = number[][];

    const schema = createSchema<NestedArray>()(({ array }) =>
      array(({ array }) => array(z.number()))
    );

    const nestedArray: NestedArray = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ];
    expect(schema.parse(nestedArray)).toEqual(nestedArray);
  });

  it("nested tuple", () => {
    type NestedTuple = [[number, string], [string, number]];

    const schema = createSchema<NestedTuple>()(({ tuple }) =>
      tuple([
        ({ tuple }) => tuple([z.number(), z.string()]),
        ({ tuple }) => tuple([z.string(), z.number()]),
      ])
    );

    expectTypeOf<NestedTuple>().branded.toEqualTypeOf<z.infer<typeof schema>>();

    const correctNestedTuple: NestedTuple = [
      [123, "string"],
      ["string", 123],
    ];
    const wrongNestedTuple = [
      ["string", 123],
      [123, "string"],
    ] as const;

    expect(schema.parse(correctNestedTuple)).toEqual(correctNestedTuple);
    expect(() => schema.parse(wrongNestedTuple)).toThrowError();
  });

  it("union", () => {
    type Union = boolean | number | { a: string } | number[];

    const unionSchema = createSchema<Union>()(({ union }) =>
      union([
        z.boolean(),
        z.number(),
        ({ object }) => object({ a: z.string() }),
        ({ array }) => array(z.number()),
      ])
    );
    const singleSchema = createSchema<Union>()(z.number());

    expect(unionSchema.parse(true)).toEqual(true);
    expect(unionSchema.parse(false)).toEqual(false);
    expect(unionSchema.parse(123)).toEqual(123);
    expect(unionSchema.parse({ a: "string" })).toEqual({ a: "string" });
    expect(unionSchema.parse([1, 2, 3, 1.1])).toEqual([1, 2, 3, 1.1]);

    expect(singleSchema.parse(123)).toEqual(123);
  });
});

describe("transforms", () => {
  it("string to number", () => {
    const schema = createSchema<string>()(
      z.string().transform((v) => parseInt(v))
    );
    expect(schema.parse("100")).toEqual(100);
  });

  it("number to string", () => {
    const schema = createSchema<number>()(
      z.number().transform((v) => v.toString())
    );
    expect(schema.parse(100)).toEqual("100");
  });

  it("object", () => {
    type Object = {
      a: string;
      b: number;
    };
    const schema = createSchema<Object>()(({ object }) =>
      object({ a: z.string(), b: z.number() }).transform(({ a, b }) => ({
        a: b,
        b: a,
      }))
    );
    expect(schema.parse({ a: "1", b: 1 })).toEqual({ a: 1, b: "1" });
  });

  it("partial object", () => {
    type NestedObject = {
      a: string;
      nested_a: {
        b: number;
        nested_b: {
          c: boolean;
        };
      };
    };
    const schema = createSchema<NestedObject>()(({ object }) =>
      object({
        nested_a: ({ object }) =>
          object({
            nested_b: ({ object }) =>
              object({ c: z.boolean().transform((_) => "string") }),
          }).transform(({ b, nested_b }) => ({
            nested_b,
            b: b.toString(),
          })),
      }).transform(({ a, nested_a }) => ({
        a,
        ...nested_a,
      }))
    );

    expectTypeOf<z.infer<typeof schema>>().branded.toEqualTypeOf<{
      a: string;
      b: string;
      nested_b: { c: string };
    }>();
    expect(
      schema.parse({
        a: "string",
        nested_a: {
          b: 100,
          nested_b: {
            c: true,
          },
        },
      })
    ).toEqual({
      a: "string",
      b: "100",
      nested_b: {
        c: "string",
      },
    });
  });
});

describe("object merging", () => {
  type ComplexType = {
    a: string;
    b: boolean;
    nested: {
      c: number;
      d: null;
    };
    array: ({ a: string; b: number } | boolean[] | ["one", "two", "three"])[];
  };

  const schema = createSchema<ComplexType>()(({ object }) =>
    object({
      a: z.string(),
      nested: ({ object }) => object({ c: z.number() }),
    })
  );

  it("parses a full schema", () => {
    const full = {
      a: "",
      b: true,
      nested: {
        c: 1,
        d: null,
      },
    };
    const result = schema.parse(full);
    expect(result).toEqual(full);
  });

  it("parses a partial schema", () => {
    const partial = {
      a: "",
      nested: {
        c: 1,
      },
    };
    const result = schema.parse(partial);
    expect(result).toEqual(partial);
  });

  it("allows parsing extra properties not part of type", () => {
    const extra = {
      a: "",
      b: true,
      nested: {
        c: 1,
        d: null,
        e: 1.2,
      },
      f: false,
    };
    const result = schema.parse(extra);
    expect(result).toEqual(extra);
  });

  it("handles complex nested arrays", () => {
    const schema = createSchema<ComplexType>()(({ object }) =>
      object({
        array: ({ array }) =>
          array(({ union }) =>
            union([
              ({ array }) => array(z.boolean()),
              ({ object }) =>
                object({
                  a: z.string(),
                  b: z.number(),
                }),
              ({ tuple }) =>
                tuple([z.literal("one"), z.literal("two"), z.literal("three")]),
            ])
          ),
      })
    );

    expectTypeOf<ComplexType>().branded.toEqualTypeOf<z.infer<typeof schema>>();

    const complexNestedArray = {
      array: [
        [true],
        {
          a: "string",
          b: 123,
        },
        ["one", "two", "three"],
      ],
    };
    expect(schema.parse(complexNestedArray)).toEqual(complexNestedArray);
  });
});

describe("union merging", () => {
  it("should merge undeclared simple union members and passthrough extra types", () => {
    type SimpleUnion = boolean | string | null;

    const symbol = Symbol("");
    const partialSimplelUnionSchema = createSchema<SimpleUnion>()(({ union }) =>
      union([z.boolean().transform((_) => symbol)])
    );

    const undeclaredMember = "string";
    expect(partialSimplelUnionSchema.parse(undeclaredMember)).toBe(
      undeclaredMember
    );

    const stringMember: SimpleUnion = "string";
    const booleanMember: SimpleUnion = true;

    // passes through undeclared member
    expect(partialSimplelUnionSchema.parse(stringMember)).toEqual(stringMember);

    // transforms declared member
    expect(partialSimplelUnionSchema.parse(booleanMember)).toEqual(symbol);

    expectTypeOf<SimpleUnion>().toEqualTypeOf<
      z.input<typeof partialSimplelUnionSchema>
    >();
    // substitutes the declared union member with its transformation output
    expectTypeOf<symbol | string | null>().toEqualTypeOf<
      z.output<typeof partialSimplelUnionSchema>
    >();
  });

  it("should merge undeclared complex union members and passthrough extra types", () => {
    type ComplexUnion = { a: string } | number[] | [{ b: boolean }, string[]];

    const partialComplexUnionSchema = createSchema<ComplexUnion>()(
      ({ union }) =>
        union([
          ({ tuple }) =>
            tuple([
              ({ object }) => object({ b: z.boolean() }),
              ({ array }) => array(z.string()),
            ]).transform(([first]) => first),
        ])
    );

    const undeclaredMember = "string";
    expect(partialComplexUnionSchema.parse(undeclaredMember)).toBe(
      undeclaredMember
    );

    const objectMember: ComplexUnion = { a: "string" };
    const tupleMember: ComplexUnion = [{ b: true }, ["string"]];

    // passes through undeclared member
    expect(partialComplexUnionSchema.parse(objectMember)).toEqual(objectMember);

    // transforms declared member
    expect(partialComplexUnionSchema.parse(tupleMember)).toEqual(
      tupleMember[0]
    );

    expectTypeOf<ComplexUnion>().toEqualTypeOf<
      z.input<typeof partialComplexUnionSchema>
    >();
    // substitutes the declared union member with its transformation output
    expectTypeOf<{ a: string } | number[] | { b: boolean }>().toEqualTypeOf<
      z.output<typeof partialComplexUnionSchema>
    >();
  });
});
