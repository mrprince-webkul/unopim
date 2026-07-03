import { useQuery } from "@tanstack/react-query";
import { getResource } from "@/lib/apiClient";

const isEmpty = (v: unknown) =>
  v == null || (Array.isArray(v) ? v.length === 0 : typeof v === "object" && Object.keys(v as object).length === 0);

export function useResource<T>(
  key: string[],
  url: string | undefined,
  opts: { fallback: T; timeoutMs?: number }
) {
  const query = useQuery({
    queryKey: [...key, url],
    enabled: Boolean(url),
    queryFn: () => getResource<T>(url as string, { timeoutMs: opts.timeoutMs }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fall back whenever there is no usable server value yet — no url, an error,
  // or empty/undefined data (including while the query is still loading). This
  // guarantees `data` is always the fallback-or-real value, never undefined.
  const usingFallback = !url || query.isError || isEmpty(query.data);
  const data = usingFallback ? opts.fallback : (query.data as T);

  return { data, isLoading: Boolean(url) && query.isLoading, isError: query.isError, usingFallback };
}
