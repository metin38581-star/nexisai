export interface DebouncedFunction<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      const callArgs = lastArgs;
      lastArgs = null;
      if (callArgs) {
        fn(...callArgs);
      }
    }, waitMs);
  }) as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId === null || !lastArgs) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = null;
    const callArgs = lastArgs;
    lastArgs = null;
    fn(...callArgs);
  };

  debounced.pending = () => timeoutId !== null;

  return debounced;
}
