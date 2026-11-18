"use client";

import { useActionState } from "react";
import { createNote, type NoteFormState } from "./actions";

export function NoteForm() {
  const [state, formAction, pending] = useActionState<NoteFormState, FormData>(createNote, {});
  return (
    <form action={formAction} className="space-y-2">
      <textarea
        name="content"
        rows={3}
        maxLength={1000}
        required
        placeholder="例如：14:20 逾時測試 → AIBorn 顯示失敗，儀表板為 terminated（有收到 SIGTERM）"
        className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "儲存中…" : "新增筆記"}
        </button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {!state.error && state.savedAt ? <span className="text-sm text-emerald-600">已儲存</span> : null}
      </div>
    </form>
  );
}
