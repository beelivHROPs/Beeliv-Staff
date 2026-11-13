"use client";

import { createContext, useContext } from "react";

/**
 * Carries the SERVER-decided auth mode (lib/auth/mode.ts authMode() === "live") to client components.
 * The browser never decides it. Default is false (preview/mock) so a component rendered outside a provider
 * behaves as in local development. Provided once in app/layout.tsx.
 */
const AuthLiveContext = createContext(false);

export function AuthLiveProvider({ live, children }: { live: boolean; children: React.ReactNode }) {
  return <AuthLiveContext.Provider value={live}>{children}</AuthLiveContext.Provider>;
}

/** True when the real auth backend is in charge (prototype switches must be inert, sign-out must be real). */
export function useAuthLive(): boolean {
  return useContext(AuthLiveContext);
}
