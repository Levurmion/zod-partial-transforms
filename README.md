# zod-partial-schema
A small wrapper around zod that allows you to build schemas against Typescript types and perform type-safe partial schema transformations.

## What is this useful for? 
There has been a lot of discussion around declaring `zod` schemas against existing Typescript types. The typical advice is to declare your schemas as follows:

```ts
const schema = z.object({ ... }) satisfies z.ZodType<unknown, YouType>;
```

Plain and simple.

However, what if your types looks like this?

```ts
type EndpointResponse = {
  available_filters: {
    product: {
      department: { id: string; desc: string }[] | null;
      sub_department: { id: string; desc: string }[] | null;
      size: { id: string; desc: string }[] | null;
      sub_class: { id: string; desc: string }[] | null;
      ...
    };
    location: {
      country: string[] | null;
      province: string[] | null;
      ...
    };
    location_clusters: string[] | null;
    product_groups: string[] | null;
    ...
  };
};
```

This is a very real request payload that I've had to deal with at the workplace. Notice how the fields have inconsistent types and how many there are! In an ideal world, this would be a BE concern but for this example, lets treat it as a FE problem. If we were to allow type inconsistencies to naively propagate across the codebase, we'll end up with glue code everywhere. 😡 Our goal is to transform this type into something more consistently workable by our components.

Using the canonical strategy, your schema would be declared like this:
```ts
const optionSchema = z
  .array(
    z.object({
      id: z.string(),
      desc: z.string(),
    })
  )
  .nullable();

const schema = z.object({
  available_filters: z.object({
    product: z.object({
      department: optionSchema,
      sub_department: optionSchema,
      size: optionSchema,
      sub_class: optionSchema,
      ...
    }),
    location: z.object({
      country: z.array(z.string()).nullable(),
      province: z.array(z.string()).nullable(),
      ...
    }),
    location_clusters: z.array(z.string()).nullable(),
    product_groups: z.array(z.string()).nullable(),
    ...
  }),
}) satisfies z.ZodType<unknown, EndpointResponse>;
```

Since Typescript is requiring that all input fields are accounted for, every field would have to be declared on the `zod` schema for the program to compile. This is sound, but what if all that we're trying to do is transform some of the fields so that the outputs are consistent?


```ts
const optionSchema = z
  .array(
    z.object({
      id: z.string(),
      desc: z.string(),
    })
  )
  .nullable();

const stringOptionSchema = z.string().transform((input) => ({
  id: input ?? "",
  desc: input ?? "",
}));

const schema = z.object({
  available_filters: z.object({
    product: z.object({
      department: optionSchema,
      sub_department: optionSchema,
      size: optionSchema,
      sub_class: optionSchema,
      ...
    }),
    location: z.object({
      country: z.array(stringOptionSchema).nullable(),
      province: z.array(stringOptionSchema).nullable(),
      ...
    }),
    location_clusters: z.array(stringOptionSchema).nullable(),
    product_groups: z.array(stringOptionSchema).nullable(),
    ...
  }),
}) satisfies z.ZodType<unknown, EndpointResponse>;
```

You're basically forced to declare the entire type despite only being interested in parts of it. There are options to maintain this boilerplate such as:
- creating partial schemas, pick/merge later with a `z.custom<T>()` type
- codegen from OpenAPI or TS types

But personally, I've always felt like these approaches were either too ad-hoc or just very heavy. I was interested to see if there could be an alternative. With the `createSchema` utility, your code can look like this:

```ts
const schema = createSchema<EndpointResponse>()(({ object }) =>
  object({
    available_filters: ({ object }) =>
      object({
        location: ({ object }) =>
          object({
            country: ({ array }) => array(stringOptionSchema).nullable(),
            province: ({ array }) => array(stringOptionSchema).nullable(),
          }),
        location_clusters: ({ array }) => array(stringOptionSchema).nullable(),
        product_groups: ({ array }) => array(stringOptionSchema).nullable(),
      }),
  })
);
```

There are a few things going on here:
1. You can safely omit the fields you're not interested in.
2. The resulting schema type is going to be equivalent with the verbosely declared one.
3. Functions, lots of functions!

Lets try and unpack this.

### `createSchema` Merges Partial Schemas Into The Original Type

When you declare:

```ts
type Foo = {
    a: string;
    b: boolean;
}
```

And build:

```ts
const fooSchema = createSchema<Foo>()(({ object }) => object({
    a: z.string(),
}))
```

It notices undeclared fields in your object and merges them in into the type signature of the schema you declared. Therefore, getting the input type of `fooSchema` will give you:

```ts
type Input = z.input<typeof fooSchema>;
// ^ {
//      a: string;
//      b: boolean;
//   }
```

On the other side, if you did perform a transform on the input:

```ts
const fooSchema = createSchema<Foo>()(({ object }) => object({
    a: z.string().transform((str) => parseInt(str)),
}))
```

It will also merge the output signature into the resulting schema.

```ts
type Output = z.output<typeof fooSchema>;
// ^ {
//      a: number;
//      b: boolean;
//   }
```

`createSchema` performs this recursively so you can do this for any level of nesting (as far as `tsc` allows). While the initial boilerplate is heavier than a plain `zod` schema, you can imagine that you might save on significant LoCs for larger types.

You can create partial schemas without leaving undeclared fields as `unknown`.

### `createSchema` Does Not Validate Runtime Inputs

By default, fields you do not declare will not be validated. Under the hood, `createSchema` makes use of `z.looseObject` to construct the schema and will allow additional fields to simply pass through. Unions are also additionally merged with the `z.unknown()` parser to ensure that you can safely target transforms to parts of an union input without throwing a runtime error. This brings us to our first ⛔️ antipattern.

> ⛔️ **DO NOT** use `createSchema` for transforming responses from third-party APIs you do not control. You want to be validating untrusted responses in full for security reasons.

The entire utility of `createSchema` is a compile-time construct. Declared fields will be validated as usual. But the primary function of this package is to allow you to simply "trace" only the paths of fields you need to transform in a declarative and type safe manner. `zod` is in practice, essentially a small runtime that exposes a "pattern matching" API which in my opinion, is extremely elegant for the purposes of data transformations.

> ✅ **DO** use `createSchema` for transforming trusted inputs from sources you control.

### Functions To Wire Together Nested/Container Types

You might notice by now that every field that holds a container type `object/array/tuple` as its value has to be declared as a function. It's helpful to understand why by evaluating this bottom-up, but concretely.

Let's start with this type:

```ts
type Builder<T> = (
    cb: <U extends T>(arg: U) => U
) => U 
```

What this is saying is that `Builder<T>` is a function that takes some callback with parameter `U` where `U extends T` returns `U` (this is the identity function), of which the main function also has to return `U`.

Sounds simple, but this is very powerful. Imagine now that `T` is an object with a nested field.

```ts
type NestedObject {
    nested: {
        field: string
    }
}
```

Doing this manually, we can easily compose `Builder` into something like this:

```ts
type NestedObjectBuilder = Builder<{
    nested: Builder<{
        field: string;
    }>
}>
```

As a concrete, runtime function, it would look like this:

```ts
const nestedBuilder: NestedObjectBuilder = (obj) =>
  obj({
    nested: (obj) =>
      obj({
        // note that not using a string type here is a type error
        field: "string",
      }),
  });
```
If we now call `nestedBuilder` with an identity function and also recursively perform that on function values of its return type, we in fact get back `NestedObject`.

> At the type level, `createSchema` asks the question: given some type `T`, what composition of `Builder` functions would satisfy the creation of an equivalent `zod` schema?

This is essentially what `createSchema` does. The trick is in recursively automating the construction of `NestedObjectBuilder` from `NestedObject`. It traverses `T` recursively, building up what is essentially an "AST" of `Builder` function signatures that will dictate how you can compose your schema. When called, `createSchema` consumes your declared `Builder` function composition and instantiates the equivalent `zod` parsers to match. Not too different from a tree-walking interpreter!

Though `createSchema` needs an additional layer of indirection. Given that we need to handle not only 1, but multiple container types (and unions!), we need to encode this instruction directly in the function composition. Looking closely at the first example:

```ts
// =======
      object({
        location: ({ object }) =>
          object({
            country: ({ array }) => array(stringOptionSchema).nullable(),
// =======
```

The supplied arg is an object that can be destructured into:

```ts
({ object, array, tuple, union }) => ...
```

Each item is a small function wrapping their corresponding `zod` parsers. However, at any point, `createSchema` will enforce that you only have access to the types declared for that field. So in the case of our `country` field, trying to destructure `object` from the argument will not compile. If you have a union, you will also have access to the `union` parser.

The key change here is that the arguments to these wrapped `object/array/tuple/union` functions are typed as the composition of other `Builder` functions that can construct the nested types. Each `Builder` is therefore recursively instantiating other `Builders` for its own internal types to ensure that only valid schemas can be constructed throughout the entire chain.

> 💡 While writing this, I came across **"tagless-final"** which apparently is the term that FP programmers and language nerds use to refer to this pattern of embedding DSLs into a strongly-typed language. I have strong interests in lang dev and type theory (I absolutely recommend the *Crafting Interpreters* book!). Though sad to admit that I haven't managed to invest as much time as I'd like into this hobby outside of my FE day job. 😢

### In Summary

Use `createSchema` when:
- You control your data source.
- You have large object payloads but only require partial transforms.
- You need untransformed types from the original payload merged into the partial, transformed schema.

## Interesting DX Quirks 🧐

I also noticed some probably less obvious emergent properties of this technique compared to the canonical strategy of declaring schemas against a typed `z.ZodType`. I'm not sure how helpful these would be in real life but they're worth highlighting nonetheless.

### Type Errors Are Localised To Function Calls

With the canonical approach, a drift between the original type and declared schema would result in a compile error like this:

```ts
const schema = z.object({
  available_filters: z.object({
    product: z.object({
      department: optionSchema,
      sub_department: optionSchema,
      size: optionSchema,
      sub_class: optionSchema,
    }),
    location: z.object({
      country: z.array(stringOptionSchema).nullable(),
      province: z.array(z.boolean()).nullable(), // say we put the wrong type here
    }),
    location_clusters: z.array(stringOptionSchema).nullable(),
    product_groups: z.array(stringOptionSchema).nullable(),
  }),
}) satisfies z.ZodType<unknown, EndpointResponse>;
```

<img width="622" height="410" alt="Screenshot 2026-01-10 at 11 01 24" src="https://github.com/user-attachments/assets/9331db6b-9d73-4cde-8b40-c3aa37ee0307" />

With `createSchema`, the exact offending line will be highlighted directly in your editor - potentially making it easier to diagnose schema drifts.

<img width="571" height="254" alt="Screenshot 2026-01-10 at 11 03 48" src="https://github.com/user-attachments/assets/7c28361a-2e39-48fc-afcc-ed284f672850" />

### Type Autocompletes

When building out your schema with the canonical strategy, you'll find that you get zero autocomplete assistance for fields or array/tuple elements. For large, deeply-nested objects, this can be mind-bending. `createSchema` will guide you through every level of the schema's construction.

<img width="568" height="433" alt="Screenshot 2026-01-10 at 11 12 23" src="https://github.com/user-attachments/assets/6c896796-4b57-4859-aaa4-e12429f3f37c" />

