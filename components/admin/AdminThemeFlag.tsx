"use client";

import { useEffect } from "react";
import { applyAdminTheme, clearAdminTheme } from "@/lib/admin/theme";

/**
 * Marks <html> with `admin-app` and the role class while the Admin area is
 * mounted, so the token overrides in app/admin/admin.css also reach layers that
 * portal to <body> (confirm dialog, sheets, popovers). The role class is
 * `admin-role-hr` for now; the Operations identity adds `admin-role-ops`.
 * Presentation only.
 */
export function AdminThemeFlag({ roleClass }: { roleClass: string }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("admin-app", roleClass);
    applyAdminTheme();
    return () => {
      root.classList.remove("admin-app", roleClass);
      clearAdminTheme();
    };
  }, [roleClass]);
  return null;
}
