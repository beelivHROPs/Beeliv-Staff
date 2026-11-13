/**
 * Admin dark mode (same mechanism as Staff and Client, lib/shared/theme.ts).
 * <html data-admin-theme="dark"> while the Admin area is mounted turns on the
 * dark token layer in app/admin/admin.css.
 */
import { createAppTheme } from "@/lib/shared/theme";

const theme = createAppTheme({ storageKey: "bv-admin-dark", appClass: "admin-app", datasetKey: "adminTheme" });

export const applyAdminTheme = theme.applyTheme;
export const clearAdminTheme = theme.clearTheme;
export const useAdminDark = theme.useDark;
export const setAdminDark = theme.setDark;
export const useAdminMode = theme.useMode;
export const setAdminMode = theme.setMode;
