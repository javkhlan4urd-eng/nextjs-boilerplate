"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface UploadedFile {
  url: string;
  type: "image" | "video";
}

export default function PhotoCapture({
  bucket,
  folder,
  multiple = false,
  initial = [],
  onChange,
}: {
  bucket: string;
  folder: string;
  multiple?: boolean;
  initial?: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Нэвтрээгүй байна");
      setUploading(false);
      return;
    }

    const uploaded: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, type: isVideo ? "video" : "image" });
    }

    const updated = multiple ? [...files, ...uploaded] : uploaded;
    setFiles(updated);
    onChange(updated);
    setUploading(false);
    if (cameraRef.current) cameraRef.current.value = "";
    if (pickerRef.current) pickerRef.current.value = "";
  }

  function removeAt(idx: number) {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onChange(updated);
  }

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={f.url}
              className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {f.type === "video" ? (
                <video src={f.url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-0 top-0 rounded-bl bg-black/60 px-1.5 py-0.5 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          📷 Камераар зураг авах
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          🖼 Файлаас сонгох
          <input
            ref={pickerRef}
            type="file"
            accept="image/*,video/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {uploading && <p className="mt-1 text-xs text-slate-500">Хуулж байна...</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
