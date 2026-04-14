import { useRef, useCallback } from 'react';

const DEFAULT_DELAY = 300; // milliseconds

export function useDoubleTap(
  onDoubleTap: () => void,
  delay: number = DEFAULT_DELAY
) {
  const lastTapRef = useRef<number>(0);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < delay && timeSinceLastTap > 0) {
      // Double tap detected
      onDoubleTap();
      lastTapRef.current = 0; // Reset to prevent triple-tap issues
    } else {
      // Single tap - store timestamp
      lastTapRef.current = now;
    }
  }, [onDoubleTap, delay]);

  return handlePress;
}
