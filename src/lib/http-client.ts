import axios from "axios";

export const httpClient = axios.create({
  withCredentials: true,
});

export function getAxiosErrorMessage(error: unknown, fallback = "请求失败") {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    return data?.error?.message ?? data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
