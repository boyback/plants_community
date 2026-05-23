import { httpClient } from "@/lib/http-client";

export interface UploadResult {
  id?: string;
  url: string;
  key?: string;
  mime?: string;
  size?: number;
  originalMime?: string;
  converted?: boolean;
}

interface UploadResponse {
  ok?: boolean;
  data?: UploadResult;
  url?: string;
  id?: string;
  key?: string;
  mime?: string;
  size?: number;
  originalMime?: string;
  converted?: boolean;
  error?: { message?: string };
}

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await httpClient.post<UploadResponse>("/api/upload", formData, {
    signal,
    onUploadProgress: (event) => {
      if (!event.total) return;
      const transportProgress = Math.round((event.loaded / event.total) * 100);
      onProgress?.(Math.min(95, transportProgress));
    },
  });

  const payload = response.data;
  if (payload?.ok === false) {
    throw new Error(payload.error?.message ?? "上传失败");
  }

  const result = payload.data ?? payload;
  if (!result?.url) {
    throw new Error("上传失败");
  }

  onProgress?.(100);
  return result as UploadResult;
}
