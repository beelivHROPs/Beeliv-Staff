"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * A function with a stable identity that always calls the newest version. The search providers
 * use it for things like sign-out, which changes identity on every render: a provider that
 * rebuilt on each render would make the results page reload its list in a loop.
 */
export function useStableFn<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
