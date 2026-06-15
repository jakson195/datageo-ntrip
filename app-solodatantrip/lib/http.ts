import "server-only";
import { unstable_noStore as noStore } from "next/cache";

/** Evita Data Cache do Next.js em fetches server-side (>2MB) */
export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

export type NoStoreInit = RequestInit & {
  next?: { revalidate?: number };
};

export function noStoreFetch(input: RequestInfo | URL, init?: NoStoreInit): Promise<Response> {
  noStore();
  const { next: _ignored, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    cache: "no-store",
    next: { revalidate: 0 },
  });
}
