const ID_RADIX = 36;
const RANDOM_SLICE_START = 2;
const RANDOM_SLICE_END = 10;

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now().toString(ID_RADIX)}_${Math.random().toString(ID_RADIX).slice(RANDOM_SLICE_START, RANDOM_SLICE_END)}`;
}
