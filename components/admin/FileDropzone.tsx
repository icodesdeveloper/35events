"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";

export default function FileDropzone({
  name,
  accept,
  multiple,
  existingPreviewUrl,
  helpText,
  required,
  onFilesSelected,
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  existingPreviewUrl?: string;
  helpText?: string;
  required?: boolean;
  // Escape hatch for callers that drive their own upload (e.g. to track
  // per-file progress) instead of relying on this being read from a native
  // form submission.
  onFilesSelected?: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  // Revoke the object URL when replaced or on unmount, so selecting a few
  // different files in a row doesn't leak blobs for the lifetime of the tab.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (inputRef.current) inputRef.current.files = files;
    setFileNames(Array.from(files).map((f) => f.name));
    if (!multiple && files[0].type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(files[0]));
    }
    onFilesSelected?.(Array.from(files));
  }

  const displayedPreview = previewUrl ?? existingPreviewUrl;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? "border-zinc-400 bg-slate-50 dark:border-zinc-500 dark:bg-zinc-800"
            : "border-slate-300 hover:border-slate-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        {displayedPreview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview or served via app/api/media
          <img src={displayedPreview} alt="" className="mx-auto mb-3 h-32 w-auto rounded-lg object-cover" />
        ) : (
          <FontAwesomeIcon icon={faCloudArrowUp} className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        )}
        <p className="text-sm font-medium text-zinc-700 dark:text-slate-300">
          Sleep {multiple ? "bestanden" : "een bestand"} hierheen, of klik om te kiezen
        </p>
        {helpText ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helpText}</p> : null}
        {fileNames.length > 0 ? (
          <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">{fileNames.join(", ")}</p>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        required={required}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
