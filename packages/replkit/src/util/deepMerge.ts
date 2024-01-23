function isObject(item: any): item is Record<string, any> {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export function deepMerge<T extends Record<string, any>, S extends Record<string, any>>(target: T, source: S): T & S {
  let output: Record<string, any> = Object.assign({}, target);
  for (let key in source) {
    if (isObject(source[key])) {
      if (!(key in target))
        Object.assign(output, { [key]: source[key] });
      else
        output[key] = deepMerge(target[key], source[key]);
    } else {
      Object.assign(output, { [key]: source[key] });
    }
  }
  return output as T & S;
}