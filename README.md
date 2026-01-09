# zod-partial-schema
A small wrapper around zod that allows you to build schemas against Typescript types and perform type-safe partial schema transformations.

## What is this useful for?
There has been a lot of discussion around declaring `zod` schemas against existing Typescript types. The typical advice is to declare your schemas as follows:
```
```