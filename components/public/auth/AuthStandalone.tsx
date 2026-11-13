import localFont from "next/font/local";
import { MotionRoot } from "@/components/public/MotionRoot";
import "@/app/(public)/public-site.css";
import "@/app/(public)/(auth)/auth.css";

// Same display font the public auth screens use (see app/(public)/layout.tsx).
const authFont = localFont({
  src: [{ path: "../../../app/fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Arial",
});

/**
 * Wraps an auth page that lives INSIDE an app (/admin/login, /client/invite/x,
 * ...). The app's shell steps aside for these paths, so there is no sidebar,
 * top bar or bottom bar; this supplies the public-site tokens, fonts and motion
 * the auth components need. `zoom: 1`: the app layout already applies the
 * large-screen zoom, so it must not be applied twice.
 */
export function AuthStandalone({ children }: { children: React.ReactNode }) {
  return (
    <div className={`public-site ${authFont.variable}`} style={{ zoom: 1 }}>
      <MotionRoot>{children}</MotionRoot>
    </div>
  );
}
