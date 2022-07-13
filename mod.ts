// deno-lint-ignore-file no-explicit-any
import * as ref from "./Reflect.ts";

for (const key in ref) {
  const value = (ref as any)[key];
  if (typeof value === "function") {
    Object.defineProperty(Reflect, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
}

export { ref as Reflect };
