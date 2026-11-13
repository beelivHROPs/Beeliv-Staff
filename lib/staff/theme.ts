/**
 * Staff dark mode (project lead, 2026-09-30): an on/off switch in Staff
 * Settings. Saved on this device only. While the Staff area is mounted,
 * <html data-staff-theme="dark"> turns on the dark token set in
 * app/staff/staff.css. The store itself is shared (lib/shared/theme.ts).
 */
import { createAppTheme } from "@/lib/shared/theme";

const theme = createAppTheme({ storageKey: "bv-staff-dark", appClass: "staff-app", datasetKey: "staffTheme" });

/** Re-apply after the Staff shell marks <html> (StaffThemeFlag). */
export const applyStaffTheme = theme.applyTheme;
/** Remove the dark flag when leaving the Staff area. */
export const clearStaffTheme = theme.clearTheme;
export const useStaffDark = theme.useDark;
export const setStaffDark = theme.setDark;
