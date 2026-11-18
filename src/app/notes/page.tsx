import { Suspense } from "react";
import { connection } from "next/server";
import { DbError } from "@/components/DbError";
import { formatTaipei } from "@/lib/format";
import { listNotes, type Note } from "@/lib/runs";
import { NoteForm } from "./NoteForm";

export default function NotesPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">實驗筆記</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          記錄每個測試情境的觀察結果。筆記存在 MySQL 的 <code>notes</code> 表；心跳排程每次會讀取筆記數量，順便驗證排程容器讀得到網站寫入的資料。
        </p>
      </section>
      <NoteForm />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
        <NotesList />
      </Suspense>
    </div>
  );
}

async function NotesList() {
  await connection();
  let notes: Note[];
  try {
    notes = await listNotes();
  } catch (error) {
    return <DbError error={error} />;
  }
  if (notes.length === 0) {
    return <p className="text-sm text-zinc-500">還沒有筆記。</p>;
  }
  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500 tabular-nums">{formatTaipei(note.createdAt)}</p>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">{note.content}</p>
        </li>
      ))}
    </ul>
  );
}
