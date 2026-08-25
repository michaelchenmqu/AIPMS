"use client";

import { useState, useTransition } from "react";
import { reviewRoomCheck, returnRoomCheckWithComment } from "@/app/portal/housekeeping/[id]/actions";

export function ReviewActions({ roomCheckId }: { roomCheckId: string }) {
  const [showComment, setShowComment] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(() => {
      reviewRoomCheck(roomCheckId, "APPROVED");
    });
  }

  function reject() {
    startTransition(() => {
      reviewRoomCheck(roomCheckId, "REJECTED");
    });
  }

  if (showComment) {
    return (
      <form action={returnRoomCheckWithComment} className="flex flex-col gap-2 mt-2">
        <input type="hidden" name="roomCheckId" value={roomCheckId} />
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          rows={2}
          placeholder="What needs another look?"
          className="w-full rounded-lg border border-[var(--color-sand-400)] px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!note.trim()}
            className="tap text-xs font-semibold bg-[var(--color-warning)] text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            Send back
          </button>
          <button
            type="button"
            onClick={() => setShowComment(false)}
            className="tap text-xs font-semibold text-[var(--color-muted)] px-2 py-1.5"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        className="tap text-xs font-semibold bg-[var(--color-navy)] text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={reject}
        disabled={pending}
        className="tap text-xs font-semibold bg-[var(--color-error)] text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => setShowComment(true)}
        disabled={pending}
        className="tap text-xs font-semibold bg-white border border-[var(--color-sand-400)] text-[var(--color-navy)] rounded-lg px-3 py-1.5 disabled:opacity-50"
      >
        Return with comment
      </button>
    </div>
  );
}
