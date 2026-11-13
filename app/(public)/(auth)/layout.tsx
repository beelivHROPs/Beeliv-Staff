import "./auth.css";

// Auth screens live under the (public) route group, so they inherit the
// scoped public-site tokens, the Newsreader display font and MotionRoot from
// app/(public)/layout.tsx. This nested layout only adds the auth-specific
// styles; each page renders its own auth frame (not the marketing header).
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
