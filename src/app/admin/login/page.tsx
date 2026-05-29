"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <div className="animate-fade-up">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 text-2xl">
          🥃
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-accent">調酒師後台</p>
        <h1 className="mb-1 mt-2 font-display text-3xl font-semibold text-gradient-gold">
          登入
        </h1>
        <p className="mb-7 text-sm text-muted">管理酒單、庫存同即時收單。</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="field w-full px-4 py-3"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密碼"
            required
            className="field w-full px-4 py-3"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full rounded-2xl px-5 py-3.5 disabled:opacity-60"
          >
            {loading ? "登入緊…" : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}
