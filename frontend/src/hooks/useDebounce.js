import { useState, useEffect } from "react";

/**
 * Returns a debounced version of the value that only updates
 * after the specified delay (ms) has elapsed without a new value.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
