import { ObjectId } from "mongodb";

type Serialized<T> =
  T extends ObjectId ? string :
  T extends Date ? string :
  T extends Array<infer U> ? Serialized<U>[] :
  T extends object ? { [K in keyof T]: Serialized<T[K]> } :
  T;

export function serialize<T>(doc: T): Serialized<T> {
  if (doc === null || doc === undefined) return doc as Serialized<T>;
  if (doc instanceof ObjectId) return doc.toString() as Serialized<T>;
  if (doc instanceof Date) return doc.toISOString() as Serialized<T>;
  if (Array.isArray(doc)) return doc.map(serialize) as Serialized<T>;
  if (typeof doc === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
      result[key] = serialize(value);
    }
    return result as Serialized<T>;
  }
  return doc as Serialized<T>;
}
