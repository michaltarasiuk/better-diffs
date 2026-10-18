import {useState} from 'react';

export function useChangeCount(value: unknown) {
  const [seen, setSeen] = useState({value, count: 0});
  if (seen.value === value) {
    return seen.count;
  }

  const next = {value, count: seen.count + 1};
  setSeen(next);
  return next.count;
}
