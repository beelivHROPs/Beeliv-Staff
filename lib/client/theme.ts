/**
 * Client dark mode (same mechanism as Staff, lib/shared/theme.ts).
 * <html data-client-theme="dark"> while the Client area is mounted turns on
 * the dark token layer in app/client/client.css.
 */
import { createAppTheme } from "@/lib/shared/theme";

const theme = createAppTheme({ storageKey: "bv-client-dark", appClass: "client-app", datasetKey: "clientTheme" });

export const applyClientTheme = theme.applyTheme;
export const clearClientTheme = theme.clearTheme;
export const useClientDark = theme.useDark;
export const setClientDark = theme.setDark;

/** Light / Dark / System preference (Settings > Appearance). The switches above set Light/Dark explicitly. */
export const useClientThemeMode = theme.useMode;
export const setClientThemeMode = theme.setMode;
