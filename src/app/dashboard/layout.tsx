import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-gray-900">AI Powered Call</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {session.user.email}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
