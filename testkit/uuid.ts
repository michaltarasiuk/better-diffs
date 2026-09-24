let next = 0;

export function uuid() {
  next += 1;
  return `00000000-0000-4000-8000-${next.toString(16).padStart(12, '0')}`;
}
