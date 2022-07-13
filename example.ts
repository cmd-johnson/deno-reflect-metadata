// run with `deno run -c tsconfig.json example.ts`

import { Reflect } from "./mod.ts";

// deno-lint-ignore no-explicit-any
type Constructor<T = unknown> = new (...args: any[]) => T;

function decorator<T>(_: Constructor<T>): void {}

@decorator
class Example {
  constructor(a: string, b: number, c: Example) {}
}

const metadata = Reflect.getMetadata("design:paramtypes", Example);
console.log(metadata);
// "[ [Function: String], [Function: Number], [Function: Example] ]"
