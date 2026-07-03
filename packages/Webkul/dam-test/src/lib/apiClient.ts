import axios from "axios";

export async function getResource<T>(url: string, opts: { timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await axios.get(url, { signal: controller.signal });
    return res.data?.data as T;
  } finally {
    clearTimeout(t);
  }
}
