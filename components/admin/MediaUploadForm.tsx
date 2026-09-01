"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileDropzone from "@/components/admin/FileDropzone";
import { MAX_MEDIA_UPLOAD_BYTES } from "@/lib/mediaClient";

const MAX_MEDIA_UPLOAD_GB = Math.round(MAX_MEDIA_UPLOAD_BYTES / (1024 * 1024 * 1024));

type UploadItem = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
};

type UploadResult = { ok: true } | { ok: false; message: string };

// A bare "Mislukt" is useless when only some files fail — these messages are
// what tell you whether the server rejected the file, the request never
// reached it, or the connection dropped mid-upload (which is what a process
// that got OOM-killed looks like from the browser).
function failureMessage(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: string };
    if (body.error) return `${body.error} (${xhr.status})`;
  } catch {
    // Not JSON — fall through to the generic status message.
  }
  if (xhr.status === 413) return "Bestand te groot (413)";
  if (xhr.status === 401) return "Sessie verlopen — log opnieuw in (401)";
  return `Serverfout (${xhr.status})`;
}

// sectionId travels as a query param, not a form field — the API route
// validates it before reading any of the (potentially multi-gigabyte) body.
function uploadFile(eventId: string, sectionId: string, file: File, onProgress: (progress: number) => void) {
  return new Promise<UploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/events/${eventId}/media?sectionId=${encodeURIComponent(sectionId)}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      resolve(
        xhr.status >= 200 && xhr.status < 300 ? { ok: true } : { ok: false, message: failureMessage(xhr) },
      );
    xhr.onerror = () => resolve({ ok: false, message: "Verbinding verbroken tijdens uploaden" });
    xhr.onabort = () => resolve({ ok: false, message: "Upload afgebroken" });
    xhr.ontimeout = () => resolve({ ok: false, message: "Time-out tijdens uploaden" });

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export default function MediaUploadForm({ eventId, sectionId }: { eventId: string; sectionId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  function updateItem(index: number, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleUpload() {
    if (items.length === 0 || uploading) return;
    setUploading(true);

    // Sequential, not parallel: order is assigned server-side from the
    // current max, so concurrent requests could race and duplicate it.
    for (let i = 0; i < items.length; i++) {
      if (items[i].file.size > MAX_MEDIA_UPLOAD_BYTES) {
        updateItem(i, { status: "error", errorMessage: `Groter dan ${MAX_MEDIA_UPLOAD_GB}GB` });
        continue;
      }
      updateItem(i, { status: "uploading" });
      const result = await uploadFile(eventId, sectionId, items[i].file, (progress) => updateItem(i, { progress }));
      updateItem(i, {
        status: result.ok ? "done" : "error",
        progress: 100,
        errorMessage: result.ok ? undefined : result.message,
      });
    }

    setUploading(false);
    router.refresh();
  }

  return (
    <div className="mb-6 space-y-3">
      <FileDropzone
        name="files"
        accept="image/*,video/*"
        multiple
        helpText={`Foto's en video's, max ${MAX_MEDIA_UPLOAD_GB}GB per bestand`}
        onFilesSelected={(files) => setItems(files.map((file) => ({ file, progress: 0, status: "pending" })))}
      />

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={`${item.file.name}-${i}`} className="text-xs">
              <div className="mb-1 flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="truncate">{item.file.name}</span>
                <span className="shrink-0 pl-2">
                  {item.status === "error" ? "Mislukt" : item.status === "done" ? "Klaar" : `${item.progress}%`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-[width] ${
                    item.status === "error" ? "bg-red-500" : "bg-zinc-900 dark:bg-white"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              {item.status === "error" && item.errorMessage ? (
                <p className="mt-1 text-red-600 dark:text-red-400">{item.errorMessage}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={handleUpload}
        disabled={items.length === 0 || uploading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
      >
        {uploading ? "Uploaden..." : "Uploaden"}
      </button>
    </div>
  );
}
