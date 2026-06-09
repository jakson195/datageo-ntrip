/** Fetch no browser — sem cache HTTP agressivo em APIs dinâmicas */
export function clientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { cache: _ignored, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    cache: "no-store",
  });
}
