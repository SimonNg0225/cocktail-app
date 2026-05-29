"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="text-sm text-muted hover:text-foreground"
    >
      登出
    </button>
  );
}
