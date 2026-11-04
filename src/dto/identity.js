// No depende de Mongoose: acepta IDs, referencias y objetos planos relacionados.
export function idOf(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  if (value._id != null && value._id !== value) return idOf(value._id);
  if (typeof value.id === 'string') return value.id;
  return null;
}
