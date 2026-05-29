import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";

// Admin gets its own PWA manifest so "加到主畫面" from the back office installs an
// app that launches at /admin (not the guest menu). Lives outside /admin/ so the
// auth middleware doesn't redirect the manifest request to the login page.
export const metadata = {
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent" as const,
    title: "調酒吧後台",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login page renders standalone (no chrome).
  if (!user) return <>{children}</>;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
      <header className="mb-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/40 text-lg">
              🥃
            </span>
            <p className="font-display text-lg font-semibold text-gradient-gold">
              調酒師後台
            </p>
          </div>
          <LogoutButton />
        </div>
        <AdminNav />
      </header>
      <div className="animate-fade-in">{children}</div>
    </div>
  );
}
