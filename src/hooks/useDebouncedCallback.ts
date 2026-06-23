"use client";

import { useEffect, useMemo, useRef } from "react";

import { debounce, type DebouncedFunction } from "@/lib/debounce";

export function useDebouncedCallback<TArgs extends readonly unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
): DebouncedFunction<TArgs> {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useMemo(
    () =>
      debounce<TArgs>((...args: TArgs) => {
        callbackRef.current(...args);
      }, delayMs),
    [delayMs],
  );

  useEffect(() => {
    return () => {
      debounced.cancel();
    };
  }, [debounced]);

  return debounced;
}
