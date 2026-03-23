"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Factory,
  Warehouse,
  Receipt,
  MessageSquare,
  UserSearch,
  Leaf,
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const iletisimSubItems = [
  { label: "Temas Kayıtları", href: "/iletisim" },
  { label: "Şablonlar", href: "/iletisim/sablonlar" },
  { label: "Sekvanslar", href: "/iletisim/sekvanslar" },
  { label: "Sosyal Medya", href: "/iletisim/sosyal-medya" },
];

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Müşteriler", href: "/musteriler", icon: Users },
  { label: "Fason Üretim", href: "/fason-uretim", icon: Factory },
  { label: "Depo / Envanter", href: "/depo", icon: Warehouse },
  { label: "Finansal Takip", href: "/finans", icon: Receipt },
  { label: "Müşteri Adayı Bul", href: "/musteri-adayi", icon: UserSearch },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const iletisimActive = pathname.startsWith("/iletisim");
  const [iletisimOpen, setIletisimOpen] = useState(iletisimActive);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">Bio Verim</p>
          <p className="text-xs text-slate-400 leading-tight">CRM Sistemi</p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto lg:hidden text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-green-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                </Link>
              </li>
            );
          })}

          {/* İletişim collapsible group */}
          <li>
            <button
              onClick={() => setIletisimOpen(o => !o)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                iletisimActive
                  ? "bg-green-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">İletişim</span>
              {iletisimOpen
                ? <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                : <ChevronRight className="w-3.5 h-3.5 opacity-70" />
              }
            </button>
            {iletisimOpen && (
              <ul className="mt-1 ml-4 space-y-0.5">
                {iletisimSubItems.map(sub => {
                  const isSubActive =
                    sub.href === "/iletisim"
                      ? pathname === "/iletisim" || pathname === "/iletisim/"
                      : pathname.startsWith(sub.href);
                  return (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          isSubActive
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                      >
                        <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                        {sub.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg"
        aria-label="Menüyü aç"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile: slide from left; desktop: fixed */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[260px] bg-slate-900 text-white flex flex-col z-50 transition-transform duration-200",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
