"use server";

import { refresh } from "next/cache";
import { errorMessage } from "@/lib/format";
import { insertNote } from "@/lib/runs";

export type NoteFormState = { error?: string; savedAt?: number };

const MAX_LENGTH = 1000;

export async function createNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "請輸入內容。" };
  if (content.length > MAX_LENGTH) return { error: `最多 ${MAX_LENGTH} 字（目前 ${content.length} 字）。` };

  try {
    await insertNote(content);
  } catch (error) {
    return { error: `儲存失敗：${errorMessage(error)}` };
  }
  refresh();
  return { savedAt: Date.now() };
}
