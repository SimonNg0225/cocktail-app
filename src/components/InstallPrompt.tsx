"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Minimal mobile-only "add to home screen" nudge. Captures the Chromium
// beforeinstallprompt event and offers a single tasteful banner; once the guest
// installs or dismisses it, we stay quiet for the rest of the session. Copy
// adapts for the admin back office (which installs its own /admin manifest).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "installPromptDismissed";

export default function InstallPrompt() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="animate-rise fixed inset-x-0 bottom-3 z-[55] mx-auto w-full max-w-md px-4">
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <span className="text-2xl">{isAdmin ? "🥃" : "🍸"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isAdmin ? "加後台到主畫面" : "加到主畫面"}
          </p>
          <p className="truncate text-xs text-muted">
            {isAdmin ? "一撳直入後台收單。" : "一撳即開，落單更快。"}
          </p>
        </div>
        <button
          onClick={install}
          className="btn-gold shrink-0 rounded-full px-3.5 py-1.5 text-sm"
        >
          加入
        </button>
        <button
          onClick={dismiss}
          aria-label="唔使喇"
          className="shrink-0 text-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
