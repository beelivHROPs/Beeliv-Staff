/**
 * Prototype-only UI (state switchers, "simulate" buttons, flow-test notices)
 * requires an explicit local opt-in and is always hidden in production builds.
 */
export const SHOW_PROTOTYPE_CONTROLS: boolean = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEVELOPER_TOOLS === "true";
