// Slow-drifting blurred gold orbs — adds ambient motion behind guest pages.
// Server component, purely decorative, sits below content (z -10).
export default function Ambient() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="animate-float absolute -left-20 top-24 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
      <div
        className="animate-float absolute -right-16 top-1/3 h-72 w-72 rounded-full bg-accent-2/10 blur-3xl"
        style={{ animationDelay: "1.6s", animationDuration: "10s" }}
      />
      <div
        className="animate-float absolute bottom-12 left-1/4 h-52 w-52 rounded-full bg-accent/[0.07] blur-3xl"
        style={{ animationDelay: "3.2s", animationDuration: "9s" }}
      />
    </div>
  );
}
