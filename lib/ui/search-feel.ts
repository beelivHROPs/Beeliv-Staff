/**
 * Prototype only: how long a search or filter waits before showing its result, so people see the spinner and
 * know the app is working instead of getting an instant jump. Set to 0 to switch it off. Remove it once the
 * real backend is connected: the real request time takes its place.
 */
export const SEARCH_FEEL_MS = process.env.NODE_ENV === "production" ? 0 : 2500;
