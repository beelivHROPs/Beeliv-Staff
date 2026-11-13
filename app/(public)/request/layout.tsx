import "../(auth)/auth.css";
import "./request.css";

// Request screens live under the (public) route group, so they inherit the
// scoped public-site tokens, the Newsreader display font and MotionRoot from
// app/(public)/layout.tsx. This nested layout only adds the request styles,
// plus auth.css for the shared inline-error / alert components
// (components/public/auth/fields.tsx), so the two flows show errors the same way.
export default function RequestLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
