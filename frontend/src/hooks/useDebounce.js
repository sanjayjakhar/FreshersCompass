import { useState, useEffect } from 'react';

/**
 * Custom React hook that debounces a fast-changing value
 * (such as live search inputs) by the specified delay in milliseconds.
 *
 * @param {any} value Value to debounce
 * @param {number} delay Milliseconds to delay update (default: 300ms)
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
