"use client";

import { deleteFitnessTest } from "@/app/(app)/fitness/actions";

export default function DeleteFitnessButton({ id }: { id: string }) {
  return (
    <form
      action={async (fd) => {
        if (confirm("Энэ сорилын үр дүнг устгах уу?")) {
          await deleteFitnessTest(fd);
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Устгах
      </button>
    </form>
  );
}
