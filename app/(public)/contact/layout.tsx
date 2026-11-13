import "../(auth)/auth.css";
import "./contact.css";

// Contact lives under the (public) route group, so it inherits the scoped
// public-site tokens, the Newsreader display font and MotionRoot from
// app/(public)/layout.tsx. This nested layout only adds the contact styles,
// plus auth.css for the shared inline-error / alert / checkbox components
// (components/public/auth/fields.tsx), so every public-site form shows
// errors the same way (same pattern as app/(public)/request/layout.tsx).
export default function ContactLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
