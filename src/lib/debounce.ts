export interface DebouncedFunction<TArgs extends readonly unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
}

export function debounce<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
): DebouncedFunction<TArgs> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const debounced = ((...args: TArgs) => {
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
  }) as DebouncedFunction<TArgs>;

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
