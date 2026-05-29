// Tiny, opt-in haptic feedback for touch devices. Silently no-ops where the
// Vibration API is missing (iOS Safari, desktop) or motion is reduced.
type Pattern = "light" | "medium" | "success";

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 8,
  medium: 18,
  success: [14, 40, 28],
};

export function haptic(pattern: Pattern = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  )
    return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // some browsers throw on rapid calls — ignore
  }
}
