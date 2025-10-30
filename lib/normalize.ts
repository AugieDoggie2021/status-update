export function toArray<T = any>(val: any, keys: string[] = ["data", "items", "risks", "actions", "workstreams"]): T[] {
  if (Array.isArray(val)) return val as T[];
  for (const k of keys) {
    if (Array.isArray(val?.[k])) return val[k] as T[];
  }
  return [] as T[];
}


