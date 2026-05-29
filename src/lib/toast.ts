// Minimal pub/sub toast bus — no context/provider plumbing. Any client module
// can fire toast("…"); the <Toaster/> mounted in the layout renders them.
export type Toast = { id: number; message: string };

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function toast(message: string, ttl = 2200) {
  const id = nextId++;
  toasts = [...toasts, { id, message }].slice(-3); // keep at most 3 on screen
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    }, ttl);
  }
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
