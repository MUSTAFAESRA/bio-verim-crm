"use client";

import { Trash2, UserMinus } from "lucide-react";
import { deleteSequenceAssignment, markCustomerPassive } from "@/actions/contact-sequences";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface DangerActionsProps {
  sequenceId: string;
}

export function DangerActions({ sequenceId }: DangerActionsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handlePassive = () => {
    if (!confirm("Müşteriyi pasif segmente almak istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await markCustomerPassive(sequenceId);
      router.push("/iletisim/sekvanslar");
    });
  };

  const handleDelete = () => {
    if (!confirm("Bu sekans atamasını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await deleteSequenceAssignment(sequenceId);
      router.push("/iletisim/sekvanslar");
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePassive}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 px-2.5 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors disabled:opacity-50"
      >
        <UserMinus className="w-3.5 h-3.5" /> Pasife Al
      </button>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" /> Sil
      </button>
    </div>
  );
}
