// Structural pattern matching over tagged values ({ tag } or { type }).
// An explicit '_' handler is the wildcard; an unhandled tag throws, giving
// runtime exhaustiveness checking for every ADT and command dispatch.

export const match = (handlers) => (value) => {
  const tag = value?.tag ?? value?.type;
  const handler = handlers[tag] ?? handlers['_'];
  if (!handler) {
    throw new TypeError(`match: unhandled tag '${tag}'`);
  }
  return handler(value);
};
