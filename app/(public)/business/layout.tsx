import "./business.css";

// /business lives under the (public) route group, so it inherits the scoped
// public-site tokens, Newsreader and MotionRoot from app/(public)/layout.tsx.
// ./business.css is now empty (the "HOW IT WORKS" section is plain Tailwind
// utilities, see components/public/business/Timeline.tsx) - kept imported
// for the @layer declaration order, in case page-specific rules return.
export default function BusinessLayout({ children }: LayoutProps<"/">) {
  return <>{children}</>;
}
