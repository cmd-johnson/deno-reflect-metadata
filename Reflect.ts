// deno-lint-ignore-file ban-types no-explicit-any
/**
 * This file was copied from https://github.com/rbuckton/reflect-metadata/blob/v0.1.12/Reflect.ts
 * and slightly modified to fix all type errors that Deno reported.
 *
 * The `export` keyword was added to the `Reflect` namespace to
 * be actually able to import and use the module in Deno.
 * Additionally, the exporter function IIFE and non-exported type
 * declarationswas moved out of the `Reflect` namespace declaration,
 * as it would otherwise not be included in bundled files when used
 * with `deno bundle`.
 */

/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

// Metadata Proposal
// https://rbuckton.github.io/reflect-metadata/

type IteratorResult<T> = { value: T; done: false } | {
  value: never;
  done: true;
};

type MemberDecorator = <T>(
  target: Object,
  propertyKey: string | symbol,
  descriptor?: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void;

const functionPrototype = Object.getPrototypeOf(Function);
// feature test for Symbol support
const supportsSymbol = typeof Symbol === "function";
const toPrimitiveSymbol =
  supportsSymbol && typeof Symbol.toPrimitive !== "undefined"
    ? Symbol.toPrimitive
    : "@@toPrimitive";
const iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined"
  ? Symbol.iterator
  : "@@iterator";

// [[Metadata]] internal slot
// https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
const Metadata = new WeakMap<
  any,
  Map<string | symbol | undefined, Map<any, any>>
>();

export function decorate(
  decorators: ClassDecorator[],
  target: Function,
): Function;
export function decorate(
  decorators: (PropertyDecorator | MethodDecorator)[],
  target: any,
  propertyKey: string | symbol,
  attributes?: PropertyDescriptor | null,
): PropertyDescriptor | undefined;
export function decorate(
  decorators: (PropertyDecorator | MethodDecorator)[],
  target: any,
  propertyKey: string | symbol,
  attributes: PropertyDescriptor,
): PropertyDescriptor;

/**
 * Applies a set of decorators to a property of a target object.
 * @param decorators An array of decorators.
 * @param target The target object.
 * @param propertyKey (Optional) The property key to decorate.
 * @param attributes (Optional) The property descriptor for the target key.
 * @remarks Decorators are applied in reverse order.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     Example = Reflect.decorate(decoratorsArray, Example);
 *
 *     // property (on constructor)
 *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
 *
 *     // property (on prototype)
 *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
 *
 *     // method (on constructor)
 *     Object.defineProperty(Example, "staticMethod",
 *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
 *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
 *
 *     // method (on prototype)
 *     Object.defineProperty(Example.prototype, "method",
 *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
 *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
 */
export function decorate(
  decorators: (ClassDecorator | MemberDecorator | MethodDecorator)[],
  target: any,
  propertyKey?: string | symbol,
  attributes?: PropertyDescriptor | null,
): PropertyDescriptor | Function | undefined {
  if (!IsUndefined(propertyKey)) {
    if (!IsArray(decorators)) throw new TypeError();
    if (!IsObject(target)) throw new TypeError();
    if (
      !IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes)
    ) {
      throw new TypeError();
    }
    if (IsNull(attributes)) attributes = undefined;
    propertyKey = ToPropertyKey(propertyKey);
    return DecorateProperty(
      <MemberDecorator[]> decorators,
      target,
      propertyKey,
      attributes,
    );
  } else {
    if (!IsArray(decorators)) throw new TypeError();
    if (!IsConstructor(target)) throw new TypeError();
    return DecorateConstructor(
      <ClassDecorator[]> decorators,
      <Function> target,
    );
  }
}

// 4.1.2 Reflect.metadata(metadataKey, metadataValue)
// https://rbuckton.github.io/reflect-metadata/#reflect.metadata

/**
 * A default metadata decorator factory that can be used on a class, class member, or parameter.
 * @param metadataKey The key for the metadata entry.
 * @param metadataValue The value for the metadata entry.
 * @returns A decorator function.
 * @remarks
 * If `metadataKey` is already defined for the target and target key, the
 * metadataValue for that key will be overwritten.
 * @example
 *
 *     // constructor
 *     @Reflect.metadata(key, value)
 *     class Example {
 *     }
 *
 *     // property (on constructor, TypeScript only)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         static staticProperty;
 *     }
 *
 *     // property (on prototype, TypeScript only)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         property;
 *     }
 *
 *     // method (on constructor)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         static staticMethod() { }
 *     }
 *
 *     // method (on prototype)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         method() { }
 *     }
 */
export function metadata(metadataKey: any, metadataValue: any) {
  function decorator(target: Function): void;
  function decorator(target: any, propertyKey: string | symbol): void;
  function decorator(target: any, propertyKey?: string | symbol): void {
    if (!IsObject(target)) throw new TypeError();
    if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey)) {
      throw new TypeError();
    }
    OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
  }
  return decorator;
}

// 4.1.3 Reflect.defineMetadata(metadataKey, metadataValue, target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect.definemetadata

export function defineMetadata(
  metadataKey: any,
  metadataValue: any,
  target: any,
): void;
export function defineMetadata(
  metadataKey: any,
  metadataValue: any,
  target: any,
  propertyKey: string | symbol,
): void;

/**
 * Define a unique metadata entry on the target.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param metadataValue A value that contains attached metadata.
 * @param target The target object on which to define metadata.
 * @param propertyKey (Optional) The property key for the target.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     Reflect.defineMetadata("custom:annotation", options, Example);
 *
 *     // property (on constructor)
 *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
 *
 *     // property (on prototype)
 *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
 *
 *     // method (on constructor)
 *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
 *
 *     // method (on prototype)
 *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
 *
 *     // decorator factory as metadata-producing annotation.
 *     function MyAnnotation(options): Decorator {
 *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
 *     }
 */
export function defineMetadata(
  metadataKey: any,
  metadataValue: any,
  target: any,
  propertyKey?: string | symbol,
): void {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryDefineOwnMetadata(
    metadataKey,
    metadataValue,
    target,
    propertyKey,
  );
}

// 4.1.4 Reflect.hasMetadata(metadataKey, target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect.hasmetadata

export function hasMetadata(metadataKey: any, target: any): boolean;
export function hasMetadata(
  metadataKey: any,
  target: any,
  propertyKey: string | symbol,
): boolean;

/**
 * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.hasMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
 */
export function hasMetadata(
  metadataKey: any,
  target: any,
  propertyKey?: string | symbol,
): boolean {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryHasMetadata(metadataKey, target, propertyKey);
}

// 4.1.5 Reflect.hasOwnMetadata(metadataKey, target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect-hasownmetadata

export function hasOwnMetadata(metadataKey: any, target: any): boolean;
export function hasOwnMetadata(
  metadataKey: any,
  target: any,
  propertyKey: string | symbol,
): boolean;

/**
 * Gets a value indicating whether the target object has the provided metadata key defined.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
 */
export function hasOwnMetadata(
  metadataKey: any,
  target: any,
  propertyKey?: string | symbol,
): boolean {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
}

// 4.1.6 Reflect.getMetadata(metadataKey, target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect-getmetadata

export function getMetadata(metadataKey: any, target: any): any;
export function getMetadata(
  metadataKey: any,
  target: any,
  propertyKey: string | symbol,
): any;

/**
 * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
 */
export function getMetadata(
  metadataKey: any,
  target: any,
  propertyKey?: string | symbol,
): any {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryGetMetadata(metadataKey, target, propertyKey);
}

// 4.1.7 Reflect.getOwnMetadata(metadataKey, target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect-getownmetadata

export function getOwnMetadata(metadataKey: any, target: any): any;
export function getOwnMetadata(
  metadataKey: any,
  target: any,
  propertyKey: string | symbol,
): any;

/**
 * Gets the metadata value for the provided metadata key on the target object.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getOwnMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
 */
export function getOwnMetadata(
  metadataKey: any,
  target: any,
  propertyKey?: string | symbol,
): any {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
}

// 4.1.8 Reflect.getMetadataKeys(target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect-getmetadatakeys

export function getMetadataKeys(target: any): any[];
export function getMetadataKeys(
  target: any,
  propertyKey: string | symbol,
): any[];

/**
 * Gets the metadata keys defined on the target object or its prototype chain.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns An array of unique metadata keys.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getMetadataKeys(Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getMetadataKeys(Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getMetadataKeys(Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getMetadataKeys(Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getMetadataKeys(Example.prototype, "method");
 */
export function getMetadataKeys(
  target: any,
  propertyKey?: string | symbol,
): any[] {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryMetadataKeys(target, propertyKey);
}

// 4.1.9 Reflect.getOwnMetadataKeys(target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect-getownmetadata

export function getOwnMetadataKeys(target: any): any[];
export function getOwnMetadataKeys(
  target: any,
  propertyKey: string | symbol,
): any[];

/**
 * Gets the unique metadata keys defined on the target object.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns An array of unique metadata keys.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getOwnMetadataKeys(Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
 */
export function getOwnMetadataKeys(
  target: any,
  propertyKey?: string | symbol,
): any[] {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  return OrdinaryOwnMetadataKeys(target, propertyKey);
}

// 4.1.10 Reflect.deleteMetadata(metadataKey, target [, propertyKey])
// https://rbuckton.github.io/reflect-metadata/#reflect-deletemetadata

export function deleteMetadata(metadataKey: any, target: any): boolean;
export function deleteMetadata(
  metadataKey: any,
  target: any,
  propertyKey: string | symbol,
): boolean;

/**
 * Deletes the metadata entry from the target object with the provided key.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata entry was found and deleted; otherwise, false.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.deleteMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
 */
export function deleteMetadata(
  metadataKey: any,
  target: any,
  propertyKey?: string | symbol,
): boolean {
  if (!IsObject(target)) throw new TypeError();
  if (!IsUndefined(propertyKey)) propertyKey = ToPropertyKey(propertyKey);
  const metadataMap = GetOrCreateMetadataMap(
    target,
    propertyKey,
    /*Create*/ false,
  );
  if (IsUndefined(metadataMap)) return false;
  if (!metadataMap.delete(metadataKey)) return false;
  if (metadataMap.size > 0) return true;
  const targetMetadata = Metadata.get(target);
  if (!targetMetadata) {
    return false;
  }
  targetMetadata.delete(propertyKey);
  if (targetMetadata.size > 0) return true;
  Metadata.delete(target);
  return true;
}

function DecorateConstructor(
  decorators: ClassDecorator[],
  target: Function,
): Function {
  for (let i = decorators.length - 1; i >= 0; --i) {
    const decorator = decorators[i];
    const decorated = decorator(target);
    if (!IsUndefined(decorated) && !IsNull(decorated)) {
      if (!IsConstructor(decorated)) throw new TypeError();
      target = <Function> decorated;
    }
  }
  return target;
}

function DecorateProperty(
  decorators: MemberDecorator[],
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor | undefined,
): PropertyDescriptor | undefined {
  for (let i = decorators.length - 1; i >= 0; --i) {
    const decorator = decorators[i];
    const decorated = decorator(target, propertyKey, descriptor);
    if (!IsUndefined(decorated) && !IsNull(decorated)) {
      if (!IsObject(decorated)) throw new TypeError();
      descriptor = <PropertyDescriptor> decorated;
    }
  }
  return descriptor;
}

// 2.1.1 GetOrCreateMetadataMap(O, P, Create)
// https://rbuckton.github.io/reflect-metadata/#getorcreatemetadatamap
function GetOrCreateMetadataMap(
  O: any,
  P: string | symbol | undefined,
  Create: true,
): Map<any, any>;
function GetOrCreateMetadataMap(
  O: any,
  P: string | symbol | undefined,
  Create: false,
): Map<any, any> | undefined;
function GetOrCreateMetadataMap(
  O: any,
  P: string | symbol | undefined,
  Create: boolean,
): Map<any, any> | undefined {
  let targetMetadata = Metadata.get(O);
  if (IsUndefined(targetMetadata)) {
    if (!Create) return undefined;
    targetMetadata = new Map<string | symbol | undefined, Map<any, any>>();
    Metadata.set(O, targetMetadata);
  }
  let metadataMap = targetMetadata.get(P);
  if (IsUndefined(metadataMap)) {
    if (!Create) return undefined;
    metadataMap = new Map<any, any>();
    targetMetadata.set(P, metadataMap);
  }
  return metadataMap;
}

// 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
function OrdinaryHasMetadata(
  MetadataKey: any,
  O: any,
  P: string | symbol | undefined,
): boolean {
  const hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
  if (hasOwn) return true;
  const parent = OrdinaryGetPrototypeOf(O);
  if (!IsNull(parent)) return OrdinaryHasMetadata(MetadataKey, parent, P);
  return false;
}

// 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
function OrdinaryHasOwnMetadata(
  MetadataKey: any,
  O: any,
  P: string | symbol | undefined,
): boolean {
  const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
  if (IsUndefined(metadataMap)) return false;
  return ToBoolean(metadataMap.has(MetadataKey));
}

// 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
function OrdinaryGetMetadata(
  MetadataKey: any,
  O: any,
  P: string | symbol | undefined,
): any {
  const hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
  if (hasOwn) return OrdinaryGetOwnMetadata(MetadataKey, O, P);
  const parent = OrdinaryGetPrototypeOf(O);
  if (!IsNull(parent)) return OrdinaryGetMetadata(MetadataKey, parent, P);
  return undefined;
}

// 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
function OrdinaryGetOwnMetadata(
  MetadataKey: any,
  O: any,
  P: string | symbol | undefined,
): any {
  const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
  if (IsUndefined(metadataMap)) return undefined;
  return metadataMap.get(MetadataKey);
}

// 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
function OrdinaryDefineOwnMetadata(
  MetadataKey: any,
  MetadataValue: any,
  O: any,
  P: string | symbol | undefined,
): void {
  const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
  metadataMap.set(MetadataKey, MetadataValue);
}

// 3.1.6.1 OrdinaryMetadataKeys(O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
function OrdinaryMetadataKeys(O: any, P: string | symbol | undefined): any[] {
  const ownKeys = OrdinaryOwnMetadataKeys(O, P);
  const parent = OrdinaryGetPrototypeOf(O);
  if (parent === null) return ownKeys;
  const parentKeys = OrdinaryMetadataKeys(parent, P);
  if (parentKeys.length <= 0) return ownKeys;
  if (ownKeys.length <= 0) return parentKeys;
  const set = new Set<any>();
  const keys: any[] = [];
  for (const key of ownKeys) {
    const hasKey = set.has(key);
    if (!hasKey) {
      set.add(key);
      keys.push(key);
    }
  }
  for (const key of parentKeys) {
    const hasKey = set.has(key);
    if (!hasKey) {
      set.add(key);
      keys.push(key);
    }
  }
  return keys;
}

// 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
function OrdinaryOwnMetadataKeys(
  O: any,
  P: string | symbol | undefined,
): any[] {
  const keys: any[] = [];
  const metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
  if (IsUndefined(metadataMap)) return keys;
  const keysObj = metadataMap.keys();
  const iterator = GetIterator(keysObj);
  let k = 0;
  while (true) {
    const next = IteratorStep(iterator);
    if (!next) {
      keys.length = k;
      return keys;
    }
    const nextValue = IteratorValue(next);
    try {
      keys[k] = nextValue;
    } catch (e) {
      try {
        IteratorClose(iterator);
      } finally {
        throw e;
      }
    }
    k++;
  }
}

// 6.1 ECMAScript Language Types
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types
const enum Tag {
  Undefined,
  Null,
  Boolean,
  String,
  Symbol,
  Number,
  Object,
}

// 6 ECMAScript Data Typ0es and Values
// https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
function Type(x: any): Tag {
  if (x === null) return Tag.Null;
  switch (typeof x) {
    case "undefined":
      return Tag.Undefined;
    case "boolean":
      return Tag.Boolean;
    case "string":
      return Tag.String;
    case "symbol":
      return Tag.Symbol;
    case "number":
      return Tag.Number;
    case "object":
      return x === null ? Tag.Null : Tag.Object;
    default:
      return Tag.Object;
  }
}

// 6.1.1 The Undefined Type
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
function IsUndefined(x: any): x is undefined {
  return x === undefined;
}

// 6.1.2 The Null Type
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
function IsNull(x: any): x is null {
  return x === null;
}

// 6.1.5 The Symbol Type
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
function IsSymbol(x: any): x is symbol {
  return typeof x === "symbol";
}

// 6.1.7 The Object Type
// https://tc39.github.io/ecma262/#sec-object-type
function IsObject<T>(
  x: T | undefined | null | boolean | string | symbol | number,
): x is T {
  return typeof x === "object" ? x !== null : typeof x === "function";
}

// 7.1 Type Conversion
// https://tc39.github.io/ecma262/#sec-type-conversion

// 7.1.1 ToPrimitive(input [, PreferredType])
// https://tc39.github.io/ecma262/#sec-toprimitive
function ToPrimitive(
  input: any,
  PreferredType?: Tag,
): undefined | null | boolean | string | symbol | number {
  switch (Type(input)) {
    case Tag.Undefined:
      return input;
    case Tag.Null:
      return input;
    case Tag.Boolean:
      return input;
    case Tag.String:
      return input;
    case Tag.Symbol:
      return input;
    case Tag.Number:
      return input;
  }
  const hint: "string" | "number" | "default" = PreferredType === Tag.String
    ? "string"
    : PreferredType === Tag.Number
    ? "number"
    : "default";
  const exoticToPrim = GetMethod(input, toPrimitiveSymbol);
  if (exoticToPrim !== undefined) {
    const result = exoticToPrim.call(input, hint);
    if (IsObject(result)) throw new TypeError();
    return result;
  }
  return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
}

// 7.1.1.1 OrdinaryToPrimitive(O, hint)
// https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
function OrdinaryToPrimitive(
  O: any,
  hint: "string" | "number",
): undefined | null | boolean | string | symbol | number {
  if (hint === "string") {
    const toString = O.toString;
    if (IsCallable(toString)) {
      const result = toString.call(O);
      if (!IsObject(result)) return result;
    }
    const valueOf = O.valueOf;
    if (IsCallable(valueOf)) {
      const result = valueOf.call(O);
      if (!IsObject(result)) return result;
    }
  } else {
    const valueOf = O.valueOf;
    if (IsCallable(valueOf)) {
      const result = valueOf.call(O);
      if (!IsObject(result)) return result;
    }
    const toString = O.toString;
    if (IsCallable(toString)) {
      const result = toString.call(O);
      if (!IsObject(result)) return result;
    }
  }
  throw new TypeError();
}

// 7.1.2 ToBoolean(argument)
// https://tc39.github.io/ecma262/2016/#sec-toboolean
function ToBoolean(argument: any): boolean {
  return !!argument;
}

// 7.1.12 ToString(argument)
// https://tc39.github.io/ecma262/#sec-tostring
function ToString(argument: any): string {
  return "" + argument;
}

// 7.1.14 ToPropertyKey(argument)
// https://tc39.github.io/ecma262/#sec-topropertykey
function ToPropertyKey(argument: any): string | symbol {
  const key = ToPrimitive(argument, Tag.String);
  if (IsSymbol(key)) return key;
  return ToString(key);
}

// 7.2 Testing and Comparison Operations
// https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations

// 7.2.2 IsArray(argument)
// https://tc39.github.io/ecma262/#sec-isarray
function IsArray(argument: any): argument is any[] {
  return Array.isArray
    ? Array.isArray(argument)
    : argument instanceof Object
    ? argument instanceof Array
    : Object.prototype.toString.call(argument) === "[object Array]";
}

// 7.2.3 IsCallable(argument)
// https://tc39.github.io/ecma262/#sec-iscallable
function IsCallable(argument: any): argument is Function {
  // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
  return typeof argument === "function";
}

// 7.2.4 IsConstructor(argument)
// https://tc39.github.io/ecma262/#sec-isconstructor
function IsConstructor(argument: any): argument is Function {
  // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
  return typeof argument === "function";
}

// 7.2.7 IsPropertyKey(argument)
// https://tc39.github.io/ecma262/#sec-ispropertykey
function IsPropertyKey(argument: any): argument is string | symbol {
  switch (Type(argument)) {
    case Tag.String:
      return true;
    case Tag.Symbol:
      return true;
    default:
      return false;
  }
}

// 7.3 Operations on Objects
// https://tc39.github.io/ecma262/#sec-operations-on-objects

// 7.3.9 GetMethod(V, P)
// https://tc39.github.io/ecma262/#sec-getmethod
function GetMethod(V: any, P: any): Function | undefined {
  const func = V[P];
  if (func === undefined || func === null) return undefined;
  if (!IsCallable(func)) throw new TypeError();
  return func;
}

// 7.4 Operations on Iterator Objects
// https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects

function GetIterator<T>(obj: Iterable<T>): Iterator<T> {
  const method = GetMethod(obj, iteratorSymbol);
  if (!IsCallable(method)) throw new TypeError(); // from Call
  const iterator = method.call(obj);
  if (!IsObject(iterator)) throw new TypeError();
  return iterator;
}

// 7.4.4 IteratorValue(iterResult)
// https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
function IteratorValue<T>(iterResult: IteratorResult<T>): T {
  return iterResult.value;
}

// 7.4.5 IteratorStep(iterator)
// https://tc39.github.io/ecma262/#sec-iteratorstep
function IteratorStep<T>(iterator: Iterator<T>): IteratorResult<T> | false {
  const result = iterator.next();
  return result.done ? false : result;
}

// 7.4.6 IteratorClose(iterator, completion)
// https://tc39.github.io/ecma262/#sec-iteratorclose
function IteratorClose<T>(iterator: Iterator<T>) {
  const f = iterator["return"];
  if (f) f.call(iterator);
}

// 9.1 Ordinary Object Internal Methods and Internal Slots
// https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots

// 9.1.1.1 OrdinaryGetPrototypeOf(O)
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
function OrdinaryGetPrototypeOf(O: any): any {
  const proto = Object.getPrototypeOf(O);
  if (typeof O !== "function" || O === functionPrototype) return proto;

  // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
  // Try to determine the superclass constructor. Compatible implementations
  // must either set __proto__ on a subclass constructor to the superclass constructor,
  // or ensure each class has a valid `constructor` property on its prototype that
  // points back to the constructor.

  // If this is not the same as Function.[[Prototype]], then this is definately inherited.
  // This is the case when in ES6 or when using __proto__ in a compatible browser.
  if (proto !== functionPrototype) return proto;

  // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
  const prototype = O.prototype;
  const prototypeProto = prototype && Object.getPrototypeOf(prototype);
  if (prototypeProto == null || prototypeProto === Object.prototype) {
    return proto;
  }

  // If the constructor was not a function, then we cannot determine the heritage.
  const constructor = prototypeProto.constructor;
  if (typeof constructor !== "function") return proto;

  // If we have some kind of self-reference, then we cannot determine the heritage.
  if (constructor === O) return proto;

  // we have a pretty good guess at the heritage.
  return constructor;
}
