"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/record", icon: Mic, label: "録音" },
  { href: "/dashboard/recordings", icon: List, label: "履歴" },
  { href: "/dashboard/settings", icon: Settings, label: "設定" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
