"use client";

import { deleteObservation } from "@/app/(app)/observations/actions";

export default function DeleteObservationButton({
  id,
  childId,
}: {
  id: string;
  childId: string;
}) {
  return (
    <form
      action={async (fd) => {
        if (confirm("Энэ ажиглалтыг устгах уу?")) {
          await deleteObservation(fd);
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="child_id" value={childId} />
      <button
        type="submit"
        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Устгах
      </button>
    </form>
  );
}
