export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-[260px]">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
