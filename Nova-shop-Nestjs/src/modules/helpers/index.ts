const removeKeyObject = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keyToRemove: K,
): Omit<T, K> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [keyToRemove]: _, ...rest } = obj;
  return rest;
};

export default removeKeyObject;
