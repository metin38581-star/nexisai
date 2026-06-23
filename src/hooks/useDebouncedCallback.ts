"use client";

import { useEffect, useMemo, useRef } from "react";

import { debounce, type DebouncedFunction } from "@/lib/debounce";

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delayMs: number,
): DebouncedFunction<T> {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debounced = useMemo(
    () =>
      debounce<T>((...args: Parameters<T>) => {
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
