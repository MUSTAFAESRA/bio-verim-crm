"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSupplier } from "@/actions/production-orders";

export function SupplierDeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <form
      action={deleteSupplier}
      onSubmit={(e) => {
        if (!confirm(`"${name}" tedarikçisini silmek istediğinize emin misiniz?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
      >
        <Trash2 className="w-3 h-3 mr-1" />
        Sil
      </Button>
    </form>
  );
}
