"use client";

import { useEffect } from "react";
import { applyStaffTheme, clearStaffTheme } from "@/lib/staff/theme";

/**
 * Marks <html> with `staff-app` while the Staff area is mounted, so the Staff
 * token overrides in app/staff/staff.css also reach layers that portal to
 * <body> (confirm dialog, sheets, popovers). Also restores the saved dark
 * mode (lib/staff/theme.ts). Presentation only.
 */
export function StaffThemeFlag() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("staff-app");
    applyStaffTheme();
    return () => {
      root.classList.remove("staff-app");
      clearStaffTheme();
    };
  }, []);
  return null;
}
