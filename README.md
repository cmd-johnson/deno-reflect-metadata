# Metadata Reflection API for Deno

> This project just fix the bundled
> [error](https://github.com/cmd-johnson/deno-reflect-metadata/pull/7) which
> caused by order.

This is a direct copy of the
[Metadata Reflection API by Microsoft](https://github.com/rbuckton/reflect-metadata)
with
[slight changes](https://github.com/cmd-johnson/deno-reflect-metadata/commit/a39666813eb7e8b38fe563f275085b60f044af7e)
to make it usable in Deno.

Check out the [Source Repository](https://github.com/rbuckton/reflect-metadata)
for more details.

## Example usage

```ts
import { Reflect } from "https://deno.land/x/deno_reflect@v0.2.1/mod.ts";

// deno-lint-ignore no-explicit-any
type Constructor<T = unknown> = new (...args: any[]) => T;

function decorator<T>(_: Constructor<T>): void {}

@decorator
class Example {
  constructor(a: string, b: number, c: Example) {}
}

console.log(Reflect.getMetadata("design:paramtypes", Example));
// "[ [Function: String], [Function: Number], [Function: Example] ]"
```

The decorator is required for the TypeScript compiler to generate metadata for
the Example class. If you don't put a decorator on the Example class, the call
to `getMetadata` will return `undefined`.

> Remember to always add a `tsconfig.json` file with the following content and
> running your code using `deno run -c tsconfig.json your_code.ts` or decorators
> and reflection will not work!

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
