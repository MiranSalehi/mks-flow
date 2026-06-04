import { useEffect, useRef } from 'react';

/**
 * Invokes a save callback after the value stops changing for the given delay.
 */
export function useDebouncedSave(
  value: string,
  onSave: () => void,
  delayMs = 500,
): void {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSaveRef.current();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
}
