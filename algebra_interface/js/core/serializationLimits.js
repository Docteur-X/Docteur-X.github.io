/** Conservative, overridable limits for opt-in serialization boundaries. */
export const SERIALIZATION_LIMITS = Object.freeze({
  maxDepth: 128, maxValues: 250000, maxArrayLength: 50000,
  maxObjects: 1000, maxHistoryNodes: 10000, maxPatchOperations: 10000,
  maxStringLength: 1000000, maxBytes: 16000000
});
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
/** Iterative JSON-data inspection prevents stack exhaustion and silent JSON loss. */
export function assertBoundedJson(value, limits = SERIALIZATION_LIMITS) {
  const stack = [{value, depth:0, leave:false}];
  const active = new Set();
  let count = 0, bytes = 0;
  while (stack.length) {
    const item = stack.pop(), v = item.value;
    if (item.leave) { active.delete(v); continue; }
    if (++count > limits.maxValues || item.depth > limits.maxDepth) throw new Error('JSON resource limit exceeded.');
    if (v === null || typeof v === 'boolean') { bytes += 5; continue; }
    if (typeof v === 'number' && Number.isFinite(v)) { bytes += 24; continue; }
    if (typeof v === 'string') {
      if (v.length > limits.maxStringLength) throw new Error('JSON string limit exceeded.');
      bytes += v.length * 3 + 2; continue;
    }
    if (typeof v !== 'object' || active.has(v) ||
        (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null))
      throw new Error('Document requires finite, acyclic JSON data.');
    // Accessors and symbol keys are not JSON data and may execute user code.
    if (Reflect.ownKeys(v).some(key => typeof key !== 'string' ||
        (Object.prototype.propertyIsEnumerable.call(v, key) &&
         !Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(v, key), 'value'))))
      throw new Error('Document requires plain JSON data properties.');
    active.add(v); stack.push({value:v, leave:true});
    if (Array.isArray(v)) {
      if (v.length > limits.maxArrayLength) throw new Error('JSON array limit exceeded.');
      for (let i=v.length-1; i>=0; i--) {
        if (!own(v,i)) throw new Error('JSON sparse array is invalid.');
        stack.push({value:v[i], depth:item.depth+1});
      }
    } else {
      const keys = Object.keys(v);
      if (keys.length > limits.maxArrayLength) throw new Error('JSON object limit exceeded.');
      for (const key of keys) {
        if (key.length > limits.maxStringLength) throw new Error('JSON key limit exceeded.');
        bytes += key.length * 3 + 3;
        stack.push({value:v[key], depth:item.depth+1});
      }
    }
    if (bytes > limits.maxBytes) throw new Error('JSON size limit exceeded.');
  }
  if (bytes > limits.maxBytes) throw new Error('JSON size limit exceeded.');
}
