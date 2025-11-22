// Generate unique idempotency key
export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};













